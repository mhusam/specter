const dotenv = require('dotenv')
dotenv.config()

const app = require('./app')
const { pool, state, ensureSchema, OUTPUT_ROOT } = require('./db/pool')
const { getSettings } = require('./db/settings')

const PORT = Number(process.env.API_PORT || 4000)

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`)
  console.log(`Contract output: ${OUTPUT_ROOT}`)
  ensureSchema(pool)
    .then(async () => {
      state.dbReady = true
      const settings = await getSettings(pool, state)
      console.log('Database connected. Model:', settings.ollamaModel)
    })
    .catch((err) => {
      state.dbReady = false
      console.error('Database connection failed. Running in degraded mode:', err.message)
    })
})
