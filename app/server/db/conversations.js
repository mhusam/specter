const CHAR_BUDGET = 16000
const HISTORY_LIMIT = 40

/**
 * Maps a DB row to the public conversation shape.
 * @param {object} row
 */
function mapConversation(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 */
async function listConversations(pool, projectId) {
  const result = await pool.query(
    'SELECT * FROM project_conversations WHERE project_id = $1 ORDER BY created_at ASC, id ASC',
    [projectId],
  )
  return result.rows.map(mapConversation)
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 * @param {string} role
 * @param {string} content
 */
async function insertConversation(pool, projectId, role, content) {
  const result = await pool.query(
    'INSERT INTO project_conversations (project_id, role, content) VALUES ($1, $2, $3) RETURNING *',
    [projectId, role, content],
  )
  return mapConversation(result.rows[0])
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 */
async function clearConversations(pool, projectId) {
  await pool.query('DELETE FROM project_conversations WHERE project_id = $1', [projectId])
}

/**
 * Returns up to HISTORY_LIMIT rows, trimmed to CHAR_BUDGET characters total
 * (reading newest-first then reversing to chronological order).
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 * @returns {Promise<Array<{ role: string, content: string }>>}
 */
async function getConversationHistory(pool, projectId) {
  const result = await pool.query(
    `SELECT role, content FROM project_conversations
     WHERE project_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [projectId, HISTORY_LIMIT],
  )

  // rows are newest-first; walk them until we exceed the char budget
  const kept = []
  let total = 0
  for (const row of result.rows) {
    if (total + row.content.length > CHAR_BUDGET) break
    kept.push(row)
    total += row.content.length
  }

  // reverse to chronological order
  kept.reverse()
  return kept
}

module.exports = {
  mapConversation,
  listConversations,
  insertConversation,
  clearConversations,
  getConversationHistory,
}
