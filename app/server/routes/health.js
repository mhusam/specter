const express = require('express')
const { pool, state } = require('../db/pool')
const { getSettings } = require('../db/settings')

const router = express.Router()

// GET /api/health
router.get('/api/health', async (_req, res, next) => {
  try {
    const settings = await getSettings(pool, state)
    let ollamaReachable = false
    let ollamaMessage = 'Not checked'
    try {
      const probe = await fetch(`${settings.ollamaBaseUrl}/api/tags`)
      ollamaReachable = probe.ok
      ollamaMessage = probe.ok ? 'Ollama reachable' : `Ollama probe failed (${probe.status})`
    } catch (error) {
      ollamaMessage = error.message
    }
    res.json({
      ok: true,
      dbReady: state.dbReady,
      model: settings.ollamaModel,
      ollamaBaseUrl: settings.ollamaBaseUrl,
      ollamaReachable,
      ollamaMessage,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/models — proxy to Ollama /api/tags
router.get('/api/models', async (_req, res, next) => {
  try {
    const settings = await getSettings(pool, state)
    const response = await fetch(`${settings.ollamaBaseUrl}/api/tags`)
    if (!response.ok) {
      return res.status(502).json({ error: `Ollama responded with ${response.status}` })
    }
    const data = await response.json()
    const models = (data.models || []).map((m) => m.name || m)
    return res.json({ models })
  } catch (err) {
    next(err)
  }
})

module.exports = router
