const express = require('express')
const fs = require('fs/promises')
const fsSync = require('fs')
const path = require('path')
const archiver = require('archiver')
const { z } = require('zod')
const { pool, state, OUTPUT_ROOT, REQUIRED_DOCS } = require('../db/pool')
const { getSettings } = require('../db/settings')
const { callOllama } = require('../lib/ollama')
const { slugify } = require('../lib/slugify')
const { initSse, sendSse } = require('../lib/sse')
const {
  mapProject,
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectAnalysis,
  updateProjectFiles,
} = require('../db/projects')

const router = express.Router()

function respondDbUnavailable(res) {
  return res.status(503).json({
    error: 'Database is unavailable. Start PostgreSQL and restart server.',
    code: 'DB_UNAVAILABLE',
  })
}

const aiQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  type: z.enum(['text', 'single', 'multi']),
  options: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
})

const projectBodySchema = z.object({
  name: z.string().min(1).max(200),
  depth: z.enum(['basic', 'intermediate', 'advanced']),
  vision: z.string().max(500).optional(),
  answers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  customQuestions: z.array(aiQuestionSchema).nullable().optional(),
})

// GET /api/projects
router.get('/api/projects', async (_req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const projects = await listProjects(pool)
    res.json(projects)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects
router.post('/api/projects', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const parsed = projectBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    }
    const project = await createProject(pool, parsed.data)
    return res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id
router.get('/api/projects/:id', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    return res.json(project)
  } catch (err) {
    next(err)
  }
})

// PUT /api/projects/:id
router.put('/api/projects/:id', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const parsed = projectBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    }
    const project = await updateProject(pool, req.params.id, parsed.data)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    return res.json(project)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/projects/:id
router.delete('/api/projects/:id', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const deleted = await deleteProject(pool, req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Project not found.' })
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/analyze
router.post('/api/projects/:id/analyze', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    const settings = await getSettings(pool, state)
    const prompt = `You are an expert software architect. Analyze the following project and provide:
1) Architecture recommendation
2) Implementation approach
3) Risk hotspots
4) Delivery milestones

Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Answers JSON:
${JSON.stringify(project.answers, null, 2)}
`
    const analysis = await callOllama(settings, prompt)
    const updated = await updateProjectAnalysis(pool, req.params.id, analysis)
    return res.json(updated)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/generate-files (sequential)
router.post('/api/projects/:id/generate-files', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    // Save snapshot before overwriting
    await pool.query(
      `INSERT INTO project_snapshots (project_id, snapshot_type, analysis, generated_files)
       VALUES ($1, 'pre_generate', $2, $3)`,
      [req.params.id, project.analysis || null, JSON.stringify(project.generatedFiles || [])],
    )

    const projectSlug = slugify(project.name || `project-${project.id}`) || `project-${project.id}`
    const outputDir = path.join(OUTPUT_ROOT, `${projectSlug}-${project.id}`)
    await fs.mkdir(outputDir, { recursive: true })

    const settings = await getSettings(pool, state)
    const files = []

    for (const filename of REQUIRED_DOCS) {
      const prompt = `Generate the markdown file "${filename}" for this software contract project.
The output must be valid markdown and specific to the project.

Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Analysis:
${project.analysis || 'No analysis yet.'}

Answers JSON:
${JSON.stringify(project.answers, null, 2)}
`
      const content = await callOllama(settings, prompt)
      await fs.writeFile(path.join(outputDir, filename), content, 'utf8')
      files.push(filename)
    }

    await fs.writeFile(
      path.join(outputDir, 'answers.json'),
      JSON.stringify(project.answers, null, 2),
      'utf8',
    )
    files.push('answers.json')

    const updated = await updateProjectFiles(pool, req.params.id, outputDir, files)
    return res.json(updated)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/generate-files/stream (parallel with SSE progress)
router.post('/api/projects/:id/generate-files/stream', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)

  let project
  try {
    project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
  } catch (err) {
    return next(err)
  }

  initSse(res)

  try {
    // Save snapshot before overwriting
    await pool.query(
      `INSERT INTO project_snapshots (project_id, snapshot_type, analysis, generated_files)
       VALUES ($1, 'pre_generate_stream', $2, $3)`,
      [req.params.id, project.analysis || null, JSON.stringify(project.generatedFiles || [])],
    )

    const projectSlug = slugify(project.name || `project-${project.id}`) || `project-${project.id}`
    const outputDir = path.join(OUTPUT_ROOT, `${projectSlug}-${project.id}`)
    await fs.mkdir(outputDir, { recursive: true })

    const settings = await getSettings(pool, state)
    const total = REQUIRED_DOCS.length
    const files = new Array(total).fill(null)
    let doneCount = 0

    // Dynamic import for p-limit (ESM-only package)
    const { default: pLimit } = await import('p-limit')
    const limit = pLimit(3)

    await Promise.all(
      REQUIRED_DOCS.map((filename, index) =>
        limit(async () => {
          const prompt = `Generate the markdown file "${filename}" for this software contract project.
The output must be valid markdown and specific to the project.

Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Analysis:
${project.analysis || 'No analysis yet.'}

Answers JSON:
${JSON.stringify(project.answers, null, 2)}
`
          const content = await callOllama(settings, prompt)
          await fs.writeFile(path.join(outputDir, filename), content, 'utf8')
          files[index] = filename
          doneCount++
          sendSse(res, 'progress', { file: filename, done: doneCount, total })
        }),
      ),
    )

    // Write answers.json
    await fs.writeFile(
      path.join(outputDir, 'answers.json'),
      JSON.stringify(project.answers, null, 2),
      'utf8',
    )
    const allFiles = [...REQUIRED_DOCS, 'answers.json']

    const updated = await updateProjectFiles(pool, req.params.id, outputDir, allFiles)
    sendSse(res, 'done', mapProject(updated))
  } catch (err) {
    sendSse(res, 'error', err.message || 'Generation failed')
  } finally {
    res.end()
  }
})

// GET /api/projects/:id/files
router.get('/api/projects/:id/files', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const result = await pool.query(
      'SELECT generated_path, generated_files FROM projects WHERE id = $1',
      [req.params.id],
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found.' })
    const row = result.rows[0]
    if (!row.generated_path) return res.json({ generatedPath: null, files: [] })

    const files = []
    for (const file of row.generated_files || []) {
      const filePath = path.join(row.generated_path, file)
      const content = await fs.readFile(filePath, 'utf8').catch(() => '')
      files.push({ name: file, content })
    }
    return res.json({ generatedPath: row.generated_path, files })
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id/export/zip
router.get('/api/projects/:id/export/zip', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const result = await pool.query(
      'SELECT name, generated_path FROM projects WHERE id = $1',
      [req.params.id],
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found.' })

    const { name, generated_path: generatedPath } = result.rows[0]
    if (!generatedPath) {
      return res.status(404).json({ error: 'No generated files for this project.' })
    }

    // Check directory exists
    try {
      await fs.access(generatedPath)
    } catch {
      return res.status(404).json({ error: 'Generated files directory not found on disk.' })
    }

    const projectSlug = slugify(name || `project-${req.params.id}`) || `project-${req.params.id}`
    const zipFilename = `${projectSlug}-${req.params.id}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', (err) => {
      // Can't call next(err) after headers sent; just destroy
      res.destroy(err)
    })

    archive.pipe(res)
    archive.directory(generatedPath, false)
    await archive.finalize()
  } catch (err) {
    next(err)
  }
})

module.exports = router
