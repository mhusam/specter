const { DEFAULT_SETTINGS } = require('./pool')

/**
 * Returns current settings: DB-stored if dbReady, else in-memory runtimeSettings.
 * @param {import('pg').Pool} pool
 * @param {{ dbReady: boolean, runtimeSettings?: object }} state
 */
async function getSettings(pool, state) {
  if (!state.dbReady) {
    return { ...(state.runtimeSettings || DEFAULT_SETTINGS) }
  }
  const result = await pool.query(`SELECT value FROM app_settings WHERE key = 'config'`)
  const stored = result.rowCount ? result.rows[0].value : {}
  const merged = { ...DEFAULT_SETTINGS, ...(stored || {}) }
  // Strip databaseUrl — it is an env-only concern, never exposed to clients
  delete merged.databaseUrl
  return merged
}

/**
 * Persists nextSettings to DB (if dbReady) and updates state.runtimeSettings.
 * @param {import('pg').Pool} pool
 * @param {{ dbReady: boolean, runtimeSettings?: object }} state
 * @param {object} nextSettings
 */
async function upsertSettings(pool, state, nextSettings) {
  state.runtimeSettings = { ...nextSettings }
  if (state.dbReady) {
    await pool.query(
      `INSERT INTO app_settings (key, value)
       VALUES ('config', $1::jsonb)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(nextSettings)],
    )
  }
}

module.exports = { getSettings, upsertSettings }
