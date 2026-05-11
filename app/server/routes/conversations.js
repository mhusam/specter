const express = require('express')
const { pool, state } = require('../db/pool')
const { getSettings } = require('../db/settings')
const { callOllama, streamOllama } = require('../lib/ollama')
const { initSse, sendSse } = require('../lib/sse')
const { getProjectById } = require('../db/projects')
const {
  mapConversation,
  listConversations,
  insertConversation,
  clearConversations,
  getConversationHistory,
} = require('../db/conversations')

const router = express.Router()

function respondDbUnavailable(res) {
  return res.status(503).json({
    error: 'Database is unavailable. Start PostgreSQL and restart server.',
    code: 'DB_UNAVAILABLE',
  })
}

function buildConversationPrompt(project, history) {
  const historyText = history
    .map((row) => `${row.role === 'user' ? 'User' : 'Assistant'}: ${row.content}`)
    .join('\n')

  return `You are a senior software planning assistant.
You are helping with this project:
Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Answers:
${JSON.stringify(project.answers, null, 2)}

Conversation history:
${historyText}

Respond to the last user message with practical guidance and clear next steps.`
}

function buildReportPrompt(project) {
  return `Create a concise project analysis report with sections:
1) Project understanding
2) Architecture recommendation
3) Risks and mitigations
4) Delivery plan
5) Immediate next actions

Project Name: ${project.name}
Depth: ${project.depth}
Vision: ${project.vision || 'N/A'}
Answers:
${JSON.stringify(project.answers, null, 2)}
`
}

// GET /api/projects/:id/conversations
router.get('/api/projects/:id/conversations', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    const conversations = await listConversations(pool, req.params.id)
    return res.json(conversations)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/projects/:id/conversations
router.delete('/api/projects/:id/conversations', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    await clearConversations(pool, req.params.id)
    return res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/conversations/chat
router.post('/api/projects/:id/conversations/chat', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' })
  }
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    await insertConversation(pool, req.params.id, 'user', message)
    const history = await getConversationHistory(pool, req.params.id)

    const settings = await getSettings(pool, state)
    const prompt = buildConversationPrompt(project, history)
    const reply = await callOllama(settings, prompt)

    const saved = await insertConversation(pool, req.params.id, 'assistant', reply)
    return res.status(201).json(saved)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/conversations/chat/stream
router.post('/api/projects/:id/conversations/chat/stream', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' })
  }

  let project
  try {
    project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
  } catch (err) {
    return next(err)
  }

  initSse(res)
  try {
    await insertConversation(pool, req.params.id, 'user', message)
    const history = await getConversationHistory(pool, req.params.id)
    const settings = await getSettings(pool, state)
    const prompt = buildConversationPrompt(project, history)

    const reply = await streamOllama(settings, prompt, (chunk) => sendSse(res, 'token', { chunk }))

    const saved = await insertConversation(pool, req.params.id, 'assistant', reply)
    sendSse(res, 'done', saved)
  } catch (error) {
    sendSse(res, 'error', error.message || 'Streaming failed')
  } finally {
    res.end()
  }
})

// POST /api/projects/:id/conversations/report
router.post('/api/projects/:id/conversations/report', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const project = await getProjectById(pool, req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })

    const settings = await getSettings(pool, state)
    const prompt = buildReportPrompt(project)
    const report = await callOllama(settings, prompt)

    const saved = await insertConversation(pool, req.params.id, 'assistant', report)
    return res.status(201).json(saved)
  } catch (err) {
    next(err)
  }
})

// POST /api/projects/:id/conversations/report/stream
router.post('/api/projects/:id/conversations/report/stream', async (req, res, next) => {
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
    const prompt = buildReportPrompt(project)
    const report = await streamOllama(settings, prompt, (chunk) => sendSse(res, 'token', { chunk }))

    const saved = await insertConversation(pool, req.params.id, 'assistant', report)
    sendSse(res, 'done', saved)
  } catch (error) {
    sendSse(res, 'error', error.message || 'Streaming failed')
  } finally {
    res.end()
  }
})

module.exports = router
