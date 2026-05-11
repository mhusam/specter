const express = require('express')
const cors = require('cors')
const path = require('path')

const healthRouter = require('./routes/health')
const settingsRouter = require('./routes/settings')
const projectsRouter = require('./routes/projects')
const conversationsRouter = require('./routes/conversations')
const aiRouter = require('./routes/ai')
const docsRouter = require('./routes/docs')
const specSessionsRouter = require('./routes/specSessions')
const specChatRouter = require('./routes/specChat')
const specVersionsRouter = require('./routes/specVersions')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Mount routers
app.use('/', healthRouter)
app.use('/', settingsRouter)
app.use('/', projectsRouter)
app.use('/', conversationsRouter)
app.use('/', aiRouter)
app.use('/', docsRouter)
app.use('/', specSessionsRouter)
app.use('/', specChatRouter)
app.use('/', specVersionsRouter)

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Unexpected server error' })
})

module.exports = app
