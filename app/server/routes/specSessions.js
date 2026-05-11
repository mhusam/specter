const express = require('express')
const { pool, state } = require('../db/pool')
const { getProjectById } = require('../db/projects')
const {
  createSpecSession,
  listSpecSessions,
  getSpecSession,
  getSpecSessionWithMessages,
  updateSpecSession,
  deleteSpecSession,
  getSpecMessages,
  insertSpecMessage,
  getSpecMessageHistory,
} = require('../db/specQueries')
const { getSettings } = require('../db/settings')
const { callOllama } = require('../lib/ollama')
const {
  buildCheckpointExtractionPrompt,
  mergeElicitedSummary,
  buildElicitedSummaryText,
} = require('../lib/specPromptBuilder')

const router = express.Router()

function dbUnavailable(res) {
  return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' })
}

async function requireProject(res, projectId) {
  const project = await getProjectById(pool, projectId)
  if (!project) { res.status(404).json({ error: 'Project not found.' }); return null }
  return project
}

async function requireSession(res, sessionId, projectId) {
  const session = await getSpecSession(pool, sessionId)
  if (!session) { res.status(404).json({ error: 'Session not found.' }); return null }
  if (String(session.projectId) !== String(projectId)) {
    res.status(403).json({ error: 'Session does not belong to this project.' }); return null
  }
  return session
}

// GET /api/projects/:id/spec/sessions
router.get('/api/projects/:id/spec/sessions', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const { status } = req.query
    const sessions = await listSpecSessions(pool, req.params.id, status)
    return res.json(sessions)
  } catch (err) { next(err) }
})

// POST /api/projects/:id/spec/sessions
router.post('/api/projects/:id/spec/sessions', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const { name } = req.body
    const session = await createSpecSession(pool, req.params.id, name || 'New Session')
    return res.status(201).json(session)
  } catch (err) { next(err) }
})

// GET /api/projects/:id/spec/sessions/:sessionId
router.get('/api/projects/:id/spec/sessions/:sessionId', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await getSpecSessionWithMessages(pool, req.params.sessionId)
    if (!session) return res.status(404).json({ error: 'Session not found.' })
    if (String(session.projectId) !== String(req.params.id)) {
      return res.status(403).json({ error: 'Session does not belong to this project.' })
    }
    return res.json(session)
  } catch (err) { next(err) }
})

// PATCH /api/projects/:id/spec/sessions/:sessionId
router.patch('/api/projects/:id/spec/sessions/:sessionId', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await requireSession(res, req.params.sessionId, req.params.id)
    if (!session) return

    const allowed = ['name', 'status', 'phase']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    // Validate status transitions
    if (updates.status && !['active', 'archived', 'completed'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status. Use: active, archived, completed.' })
    }

    const updated = await updateSpecSession(pool, req.params.sessionId, updates)
    return res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/projects/:id/spec/sessions/:sessionId
router.delete('/api/projects/:id/spec/sessions/:sessionId', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await requireSession(res, req.params.sessionId, req.params.id)
    if (!session) return
    await deleteSpecSession(pool, req.params.sessionId)
    return res.status(204).send()
  } catch (err) { next(err) }
})

// GET /api/projects/:id/spec/sessions/:sessionId/messages
router.get('/api/projects/:id/spec/sessions/:sessionId/messages', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await requireSession(res, req.params.sessionId, req.params.id)
    if (!session) return
    const { limit, offset } = req.query
    const messages = await getSpecMessages(pool, req.params.sessionId, Number(limit) || 200, Number(offset) || 0)
    return res.json(messages)
  } catch (err) { next(err) }
})

// POST /api/projects/:id/spec/sessions/:sessionId/checkpoint
// Runs Ollama extraction on recent messages, merges into session.elicited_summary_jsonb
router.post('/api/projects/:id/spec/sessions/:sessionId/checkpoint', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await requireSession(res, req.params.sessionId, req.params.id)
    if (!session) return

    // Get recent messages since last checkpoint (or all messages if first checkpoint)
    const allMessages = await getSpecMessageHistory(pool, req.params.sessionId, 40000, 60)
    if (allMessages.length === 0) {
      return res.json({ session, checkpointMessage: null, message: 'No messages to extract from.' })
    }

    const settings = await getSettings(pool, state)
    const extractionPrompt = buildCheckpointExtractionPrompt(allMessages)

    let extractedJson
    try {
      const raw = await callOllama(settings, extractionPrompt)
      // Strip markdown code blocks if present
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      extractedJson = JSON.parse(cleaned)
    } catch (parseErr) {
      return res.status(422).json({ error: 'Could not parse extraction response. Try again.' })
    }

    // Merge with existing
    const merged = mergeElicitedSummary(session.elicitedSummaryJsonb, extractedJson)
    const summaryText = buildElicitedSummaryText(merged)

    // Save checkpoint message
    const checkpointContent = `**Checkpoint Summary** (${session.checkpointCount + 1})\n\n${summaryText}`
    const checkpointMsg = await insertSpecMessage(
      pool, req.params.sessionId, 'assistant', checkpointContent, 'checkpoint', session.phase,
    )

    // Update session
    const updatedSession = await updateSpecSession(pool, req.params.sessionId, {
      elicitedSummaryJsonb: merged,
      elicitedSummary: summaryText,
      checkpointCount: session.checkpointCount + 1,
    })

    return res.json({ session: updatedSession, checkpointMessage: checkpointMsg })
  } catch (err) { next(err) }
})

// POST /api/projects/:id/spec/sessions/:sessionId/duplicate
// Clones a session (name, elicited summary, all messages) into a new active session
router.post('/api/projects/:id/spec/sessions/:sessionId/duplicate', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)
  try {
    const project = await requireProject(res, req.params.id)
    if (!project) return
    const session = await requireSession(res, req.params.sessionId, req.params.id)
    if (!session) return

    // Create new session copying metadata
    const newName = `${session.name} (copy)`
    const allMessages = await getSpecMessages(pool, req.params.sessionId, 500, 0)

    const client = await pool.connect()
    let newSession
    try {
      await client.query('BEGIN')

      const { rows } = await client.query(
        `INSERT INTO spec_sessions
           (project_id, name, status, phase, elicited_summary, elicited_summary_jsonb,
            checkpoint_count, message_count)
         VALUES ($1,$2,'active',$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          req.params.id, newName, session.phase,
          session.elicitedSummary, session.elicitedSummaryJsonb
            ? JSON.stringify(session.elicitedSummaryJsonb) : null,
          session.checkpointCount, 0,
        ],
      )
      const newId = rows[0].id

      // Copy messages in order
      for (const msg of allMessages) {
        await client.query(
          `INSERT INTO spec_messages (session_id, role, content, message_type, phase_at_send, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [newId, msg.role, msg.content, msg.messageType, msg.phaseAtSend, msg.createdAt],
        )
      }

      // Update message_count
      await client.query(
        `UPDATE spec_sessions SET message_count = $1 WHERE id = $2`,
        [allMessages.length, newId],
      )

      await client.query('COMMIT')

      const { rows: sessionRows } = await client.query('SELECT * FROM spec_sessions WHERE id=$1', [newId])
      const { mapSession: ms } = (() => {
        // inline mapSession since it's not exported from specQueries
        function mapSession(row) {
          return {
            id: row.id, projectId: row.project_id, name: row.name, status: row.status,
            phase: row.phase, producedVersionId: row.produced_version_id,
            elicitedSummary: row.elicited_summary, elicitedSummaryJsonb: row.elicited_summary_jsonb,
            checkpointCount: row.checkpoint_count, messageCount: row.message_count,
            createdAt: row.created_at, updatedAt: row.updated_at,
          }
        }
        return { mapSession }
      })()
      newSession = ms(sessionRows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return res.status(201).json(newSession)
  } catch (err) { next(err) }
})

module.exports = router
