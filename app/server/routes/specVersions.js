const express = require('express')
const archiver = require('archiver')
const { pool, state } = require('../db/pool')
const { getProjectById } = require('../db/projects')
const { getSettings } = require('../db/settings')
const { callOllama } = require('../lib/ollama')
const { initSse, sendSse } = require('../lib/sse')
const {
  getSpecSession,
  listSpecVersions,
  getSpecVersion,
  setCurrentSpecVersion,
} = require('../db/specQueries')
const { SPEC_DOC_CATALOG, buildRequirementsContext } = require('../lib/specDocCatalog')
const { createVersionTransaction } = require('../lib/specVersioning')

const router = express.Router()

function dbUnavailable(res) {
  return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' })
}

// GET /api/projects/:id/spec/versions
router.get('/api/projects/:id/spec/versions', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const versions = await listSpecVersions(pool, req.params.id)
    return res.json(versions)
  } catch (err) { next(err) }
})

// GET /api/projects/:id/spec/versions/:versionId
router.get('/api/projects/:id/spec/versions/:versionId', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const version = await getSpecVersion(pool, req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found.' })
    if (String(version.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Version does not belong to this project.' })
    }
    return res.json(version)
  } catch (err) { next(err) }
})

// PATCH /api/projects/:id/spec/versions/:versionId/set-current
router.patch('/api/projects/:id/spec/versions/:versionId/set-current', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const version = await getSpecVersion(pool, req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found.' })
    if (String(version.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Version does not belong to this project.' })
    }
    await setCurrentSpecVersion(pool, req.params.id, req.params.versionId)
    return res.json({ success: true, versionId: Number(req.params.versionId) })
  } catch (err) { next(err) }
})

// GET /api/projects/:id/spec/versions/:versionId/export
router.get('/api/projects/:id/spec/versions/:versionId/export', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const version = await getSpecVersion(pool, req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found.' })
    if (String(version.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Version does not belong to this project.' })
    }

    const { format } = req.query
    const snapshot = version.docsSnapshot || {}
    const slug = project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    if (format === 'zip') {
      const zipName = `${slug}-spec-${version.versionLabel}.zip`
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`)
      res.setHeader('Content-Type', 'application/zip')

      const archive = archiver('zip', { zlib: { level: 9 } })
      archive.on('error', (err) => next(err))
      archive.pipe(res)

      const folderName = `${slug}-spec-${version.versionLabel}`
      for (const [docKey, docData] of Object.entries(snapshot)) {
        if (docData.content) {
          archive.append(docData.content, { name: `${folderName}/${docKey}` })
        }
      }
      await archive.finalize()
    } else {
      // Default: concatenated markdown bundle
      const fileName = `${slug}-spec-${version.versionLabel}.md`
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Content-Type', 'text/markdown')

      const header = `---
project: ${project.name}
version: ${version.versionLabel}
generated: ${new Date(version.createdAt).toISOString().slice(0, 10)}
change_type: ${version.changeType}
change_summary: ${version.changeSummary || ''}
documents: ${Object.keys(snapshot).length}
---

# ${project.name} — Complete Specification Package ${version.versionLabel}

`
      res.write(header)

      for (const [docKey, docData] of Object.entries(snapshot)) {
        if (!docData.content) continue
        res.write(`\n\n---\n\n<!-- START: ${docKey} | ${docData.title || docKey} -->\n\n`)
        res.write(docData.content)
        res.write(`\n\n<!-- END: ${docKey} -->\n`)
      }

      res.end()
    }
  } catch (err) { next(err) }
})

// POST /api/projects/:id/spec/sessions/:sessionId/generate
// SSE stream: generate all 22 spec docs and create a versioned snapshot
router.post('/api/projects/:id/spec/sessions/:sessionId/generate', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)

  const { changeType, changeSummary } = req.body
  if (!['initial', 'major', 'minor', 'patch'].includes(changeType)) {
    return res.status(400).json({ error: 'changeType must be: initial, major, minor, patch' })
  }

  let project, session
  try {
    project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    session = await getSpecSession(pool, req.params.sessionId)
    if (!session) return res.status(404).json({ error: 'Session not found.' })
    if (String(session.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Session does not belong to this project.' })
    }
  } catch (err) {
    return next(err)
  }

  initSse(res)

  try {
    const settings = await getSettings(pool, state)
    const reqContext = buildRequirementsContext(session)

    const total = SPEC_DOC_CATALOG.length
    const generatedDocs = {}

    // Dynamic import for p-limit (ESM-only)
    const { default: pLimit } = await import('p-limit')
    const limit = pLimit(2) // 2 concurrent to avoid overwhelming Ollama

    await Promise.all(
      SPEC_DOC_CATALOG.map((docConfig) =>
        limit(async () => {
          sendSse(res, 'doc_start', {
            docKey: docConfig.key,
            title: docConfig.title,
            index: SPEC_DOC_CATALOG.indexOf(docConfig) + 1,
            total,
          })

          try {
            const prompt = docConfig.promptTemplate(project, reqContext)
            const content = await callOllama(settings, prompt)
            const wordCount = content.split(/\s+/).filter(Boolean).length

            generatedDocs[docConfig.key] = {
              title: docConfig.title,
              category: docConfig.category,
              content,
              status: 'done',
              wordCount,
              errorMessage: null,
              generatedAt: new Date().toISOString(),
            }

            sendSse(res, 'doc_complete', { docKey: docConfig.key, status: 'done', wordCount })
          } catch (err) {
            generatedDocs[docConfig.key] = {
              title: docConfig.title,
              category: docConfig.category,
              content: null,
              status: 'error',
              wordCount: 0,
              errorMessage: err.message || 'Generation failed',
              generatedAt: null,
            }
            sendSse(res, 'doc_error', { docKey: docConfig.key, error: err.message || 'Generation failed' })
          }
        }),
      ),
    )

    // Create the version snapshot atomically
    const version = await createVersionTransaction(
      pool, req.params.id, req.params.sessionId, session,
      changeType, changeSummary || '', generatedDocs,
    )

    sendSse(res, 'generation_complete', {
      versionId: version.id,
      versionLabel: version.versionLabel,
      successCount: version.docCountSuccess,
      errorCount: version.docCountError,
    })
  } catch (err) {
    sendSse(res, 'error', err.message || 'Generation failed')
  } finally {
    res.end()
  }
})

// POST /api/projects/:id/spec/versions/:versionId/retry-failed
// SSE: re-run only error docs in an existing version snapshot, update in-place (no new version)
router.post('/api/projects/:id/spec/versions/:versionId/retry-failed', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const version = await getSpecVersion(pool, req.params.versionId)
    if (!version) return res.status(404).json({ error: 'Version not found.' })
    if (String(version.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Version does not belong to this project.' })
    }
  } catch (err) { return next(err) }

  let project, version
  try {
    project = await getProjectById(pool, req.params.id)
    version = await getSpecVersion(pool, req.params.versionId)
  } catch (err) { return next(err) }

  const snapshot = version.docsSnapshot || {}
  const failedKeys = Object.entries(snapshot)
    .filter(([, doc]) => doc.status === 'error')
    .map(([key]) => key)

  if (failedKeys.length === 0) {
    return res.status(400).json({ error: 'No failed docs to retry.' })
  }

  initSse(res)

  try {
    const settings = await getSettings(pool, state)

    // Get the session for context if available
    let session = null
    if (version.sessionId) {
      try {
        session = await getSpecSession(pool, version.sessionId)
      } catch { /* ignore */ }
    }
    const reqContext = session ? buildRequirementsContext(session) : ''

    const failedCatalog = SPEC_DOC_CATALOG.filter(d => failedKeys.includes(d.key))
    const total = failedCatalog.length

    const { default: pLimit } = await import('p-limit')
    const limit = pLimit(2)

    const updatedDocs = {}
    await Promise.all(
      failedCatalog.map((docConfig) =>
        limit(async () => {
          sendSse(res, 'doc_start', { docKey: docConfig.key, title: docConfig.title, index: failedCatalog.indexOf(docConfig) + 1, total })
          try {
            const prompt = docConfig.promptTemplate(project, reqContext)
            const content = await callOllama(settings, prompt)
            const wordCount = content.split(/\s+/).filter(Boolean).length
            updatedDocs[docConfig.key] = {
              ...snapshot[docConfig.key],
              content, status: 'done', wordCount,
              errorMessage: null, generatedAt: new Date().toISOString(),
            }
            sendSse(res, 'doc_complete', { docKey: docConfig.key, status: 'done', wordCount })
          } catch (err) {
            updatedDocs[docConfig.key] = { ...snapshot[docConfig.key], status: 'error', errorMessage: err.message }
            sendSse(res, 'doc_error', { docKey: docConfig.key, error: err.message })
          }
        }),
      ),
    )

    // Merge updated docs back into snapshot and update version in-place
    const newSnapshot = { ...snapshot, ...updatedDocs }
    const successCount = Object.values(newSnapshot).filter(d => d.status === 'done').length
    const errorCount = Object.values(newSnapshot).filter(d => d.status === 'error').length

    await pool.query(
      `UPDATE spec_versions SET docs_snapshot = $1, doc_count_success = $2, doc_count_error = $3 WHERE id = $4`,
      [JSON.stringify(newSnapshot), successCount, errorCount, req.params.versionId],
    )

    sendSse(res, 'retry_complete', {
      versionId: version.id, successCount, errorCount,
      fixedCount: failedKeys.length - errorCount,
    })
  } catch (err) {
    sendSse(res, 'error', err.message || 'Retry failed')
  } finally {
    res.end()
  }
})

module.exports = router
