const express = require('express')
const { pool, state, DOC_CATALOG } = require('../db/pool')
const { getProjectById } = require('../db/projects')
const { getDocStates, getDocState, upsertDocState } = require('../db/docs')
const { getSettings } = require('../db/settings')
const { callOllama, streamOllama } = require('../lib/ollama')
const { buildDocPrompt } = require('../lib/doc-prompts')
const { initSse, sendSse } = require('../lib/sse')

const router = express.Router()

function respondDbUnavailable(res) {
  return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' })
}

/**
 * Ensures all 31 catalog entries have a row in project_doc_states.
 * Inserts missing rows as 'pending', returns the full list.
 */
async function ensureDocStates(projectId) {
  const existing = await getDocStates(pool, projectId)
  const existingKeys = new Set(existing.map((d) => d.docKey))

  const missing = DOC_CATALOG.filter((d) => !existingKeys.has(d.key))
  if (missing.length > 0) {
    // Batch insert missing docs as pending
    for (const doc of missing) {
      await upsertDocState(pool, projectId, doc.key, {
        category: doc.category,
        title: doc.title,
        status: 'pending',
      })
    }
    return getDocStates(pool, projectId)
  }
  return existing
}

// GET /api/projects/:id/docs
// Returns all doc states for the project (status + metadata, no content for list performance)
router.get('/api/projects/:id/docs', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    const docs = await ensureDocStates(req.params.id)
    // Strip content from list response for performance
    const docsWithoutContent = docs.map((d) => ({ ...d, content: null }))
    return res.json(docsWithoutContent)
  } catch (err) {
    next(err)
  }
})

// GET /api/projects/:id/docs/:docKey
// Returns single doc state WITH content
router.get('/api/projects/:id/docs/:docKey', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    const docKey = req.params.docKey
    let doc = await getDocState(pool, req.params.id, docKey)

    // If the doc doesn't exist yet, initialize it from catalog
    if (!doc) {
      const catalogEntry = DOC_CATALOG.find((d) => d.key === docKey)
      if (!catalogEntry) return res.status(404).json({ error: 'Document key not found in catalog.' })
      doc = await upsertDocState(pool, req.params.id, docKey, {
        category: catalogEntry.category,
        title: catalogEntry.title,
        status: 'pending',
      })
    }

    return res.json(doc)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/docs/generate/stream
// Body: { docKeys?: string[] }  (omit for all 31)
// SSE stream: progress events per doc, done event with all doc states
router.post('/api/projects/:id/docs/generate/stream', async (req, res, next) => {
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
    const settings = await getSettings(pool, state)

    // Determine which docs to generate
    const { docKeys } = req.body
    const targetDocs = docKeys && Array.isArray(docKeys) && docKeys.length > 0
      ? DOC_CATALOG.filter((d) => docKeys.includes(d.key))
      : DOC_CATALOG

    const total = targetDocs.length
    let doneCount = 0

    // Mark all targets as 'generating' upfront
    for (const doc of targetDocs) {
      await upsertDocState(pool, req.params.id, doc.key, {
        category: doc.category,
        title: doc.title,
        status: 'generating',
      })
    }

    // Dynamic import for p-limit (ESM-only package)
    const { default: pLimit } = await import('p-limit')
    const limit = pLimit(3)

    await Promise.all(
      targetDocs.map((doc) =>
        limit(async () => {
          try {
            const prompt = buildDocPrompt(doc.key, project)
            const content = await callOllama(settings, prompt)

            await upsertDocState(pool, req.params.id, doc.key, {
              category: doc.category,
              title: doc.title,
              status: 'done',
              content,
              generatedAt: new Date().toISOString(),
            })

            doneCount++
            sendSse(res, 'progress', {
              docKey: doc.key,
              status: 'done',
              done: doneCount,
              total,
            })
          } catch (err) {
            await upsertDocState(pool, req.params.id, doc.key, {
              category: doc.category,
              title: doc.title,
              status: 'error',
              errorMessage: err.message || 'Generation failed',
            })

            doneCount++
            sendSse(res, 'progress', {
              docKey: doc.key,
              status: 'error',
              error: err.message || 'Generation failed',
              done: doneCount,
              total,
            })
          }
        }),
      ),
    )

    // Return all doc states (including ones not regenerated this time)
    const allDocs = await getDocStates(pool, req.params.id)
    sendSse(res, 'done', allDocs)
  } catch (err) {
    sendSse(res, 'error', err.message || 'Generation failed')
  } finally {
    res.end()
  }
})

// POST /api/projects/:id/docs/:docKey/regenerate/stream
// SSE stream: token events + done event for single doc
router.post('/api/projects/:id/docs/:docKey/regenerate/stream', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)

  let project
  try {
    project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
  } catch (err) {
    return next(err)
  }

  const docKey = req.params.docKey
  const catalogEntry = DOC_CATALOG.find((d) => d.key === docKey)
  if (!catalogEntry) {
    return res.status(404).json({ error: 'Document key not found in catalog.' })
  }

  initSse(res)

  try {
    const settings = await getSettings(pool, state)

    // Mark as generating
    await upsertDocState(pool, req.params.id, docKey, {
      category: catalogEntry.category,
      title: catalogEntry.title,
      status: 'generating',
    })

    const prompt = buildDocPrompt(docKey, project)
    let fullContent = ''

    await streamOllama(settings, prompt, (chunk) => {
      fullContent += chunk
      sendSse(res, 'token', { chunk })
    })

    const doc = await upsertDocState(pool, req.params.id, docKey, {
      category: catalogEntry.category,
      title: catalogEntry.title,
      status: 'done',
      content: fullContent,
      generatedAt: new Date().toISOString(),
    })

    sendSse(res, 'done', doc)
  } catch (err) {
    // Mark as error
    try {
      await upsertDocState(pool, req.params.id, docKey, {
        category: catalogEntry.category,
        title: catalogEntry.title,
        status: 'error',
        errorMessage: err.message || 'Regeneration failed',
      })
    } catch {
      // ignore secondary error
    }
    sendSse(res, 'error', err.message || 'Regeneration failed')
  } finally {
    res.end()
  }
})

module.exports = router
