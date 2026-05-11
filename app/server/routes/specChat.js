const express = require('express')
const { pool, state } = require('../db/pool')
const { getProjectById } = require('../db/projects')
const { getSettings } = require('../db/settings')
const { streamOllama } = require('../lib/ollama')
const { initSse, sendSse } = require('../lib/sse')
const {
  getSpecSession,
  insertSpecMessage,
  getSpecMessageHistory,
  updateSpecSession,
} = require('../db/specQueries')
const {
  buildChatSystemPrompt,
  detectPhaseTransition,
  shouldSuggestPhaseAdvance,
} = require('../lib/specPromptBuilder')

const router = express.Router()

function dbUnavailable(res) {
  return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' })
}

// POST /api/projects/:id/spec/sessions/:sessionId/chat
// SSE streaming endpoint — chat with the Spec Agent
router.post('/api/projects/:id/spec/sessions/:sessionId/chat', async (req, res, next) => {
  if (!state.dbReady) return dbUnavailable(res)

  const { message } = req.body
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required.' })
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

    if (session.status === 'archived') {
      return res.status(400).json({ error: 'Cannot chat in an archived session. Restore it first.' })
    }
  } catch (err) {
    return next(err)
  }

  initSse(res)

  try {
    // Save user message
    await insertSpecMessage(pool, req.params.sessionId, 'user', message.trim(), 'chat', session.phase)

    // Get conversation history for context
    const history = await getSpecMessageHistory(pool, req.params.sessionId, 20000, 30)

    const settings = await getSettings(pool, state)
    const systemPrompt = buildChatSystemPrompt(project, session, history)

    // Stream Ollama response
    let fullReply = ''
    await streamOllama(settings, systemPrompt, (chunk) => {
      fullReply += chunk
      sendSse(res, 'token', { chunk })
    })

    // Detect phase transitions
    const transitionTo = detectPhaseTransition(fullReply)

    // Clean READY_FOR_GENERATION from the saved content
    const cleanedReply = fullReply.replace(/READY_FOR_GENERATION/g, '').trim()

    // Determine message type
    const msgType = transitionTo === 'completed' ? 'phase_transition' : 'chat'
    const savedMsg = await insertSpecMessage(
      pool, req.params.sessionId, 'assistant', cleanedReply, msgType, session.phase,
    )

    // Update session phase if transition detected
    let currentPhase = session.phase
    if (transitionTo && transitionTo !== session.phase) {
      await updateSpecSession(pool, req.params.sessionId, { phase: transitionTo })
      currentPhase = transitionTo
      sendSse(res, 'phase_transition', { newPhase: transitionTo })
    }

    // Heuristic: suggest phase advance based on message count
    const newMessageCount = session.messageCount + 2 // user + assistant
    const suggestedPhase = shouldSuggestPhaseAdvance({ phase: currentPhase }, newMessageCount)
    if (suggestedPhase && !transitionTo) {
      sendSse(res, 'phase_suggestion', {
        suggestedPhase,
        reason: `You've had ${newMessageCount} exchanges in the ${currentPhase} phase. Consider moving to ${suggestedPhase}.`,
      })
    }

    // Suggest checkpoint every 10 user messages
    if (newMessageCount % 10 === 0) {
      sendSse(res, 'checkpoint_suggested', { messageCount: newMessageCount })
    }

    sendSse(res, 'done', { message: savedMsg, phase: currentPhase })
  } catch (err) {
    sendSse(res, 'error', err.message || 'Spec chat failed')
  } finally {
    res.end()
  }
})

module.exports = router
