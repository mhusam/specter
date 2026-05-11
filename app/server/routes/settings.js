const express = require('express')
const { z } = require('zod')
const { pool, state, DEFAULT_SETTINGS } = require('../db/pool')
const { getSettings, upsertSettings } = require('../db/settings')

const router = express.Router()

const settingsSchema = z.object({
  designConcept: z.string().optional(),
  ollamaBaseUrl: z.string().min(1),
  ollamaModel: z.string().min(1),
})

// GET /api/settings
router.get('/api/settings', async (_req, res, next) => {
  try {
    const settings = await getSettings(pool, state)
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

// PUT /api/settings
router.put('/api/settings', async (req, res, next) => {
  try {
    const parsed = settingsSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    }

    const nextSettings = {
      designConcept: parsed.data.designConcept || DEFAULT_SETTINGS.designConcept,
      ollamaBaseUrl: parsed.data.ollamaBaseUrl,
      ollamaModel: parsed.data.ollamaModel,
    }

    await upsertSettings(pool, state, nextSettings)
    res.json(nextSettings)
  } catch (err) {
    next(err)
  }
})

module.exports = router
