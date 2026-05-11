/**
 * Maps a DB row to the public doc state shape.
 * @param {object} row
 */
function mapDocState(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    docKey: row.doc_key,
    category: row.category,
    title: row.title,
    status: row.status,
    content: row.content || null,
    errorMessage: row.error_message || null,
    generatedAt: row.generated_at || null,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 */
async function getDocStates(pool, projectId) {
  const result = await pool.query(
    'SELECT * FROM project_doc_states WHERE project_id = $1 ORDER BY doc_key',
    [projectId],
  )
  return result.rows.map(mapDocState)
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 * @param {string} docKey
 */
async function getDocState(pool, projectId, docKey) {
  const result = await pool.query(
    'SELECT * FROM project_doc_states WHERE project_id = $1 AND doc_key = $2',
    [projectId, docKey],
  )
  return result.rowCount ? mapDocState(result.rows[0]) : null
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} projectId
 * @param {string} docKey
 * @param {{ category: string, title: string, status: string, content?: string, errorMessage?: string, generatedAt?: string }} fields
 */
async function upsertDocState(pool, projectId, docKey, fields) {
  const result = await pool.query(
    `INSERT INTO project_doc_states (project_id, doc_key, category, title, status, content, error_message, generated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (project_id, doc_key) DO UPDATE SET
       status = EXCLUDED.status,
       content = COALESCE(EXCLUDED.content, project_doc_states.content),
       error_message = EXCLUDED.error_message,
       generated_at = EXCLUDED.generated_at
     RETURNING *`,
    [
      projectId,
      docKey,
      fields.category,
      fields.title,
      fields.status,
      fields.content ?? null,
      fields.errorMessage ?? null,
      fields.generatedAt ?? null,
    ],
  )
  return mapDocState(result.rows[0])
}

module.exports = { getDocStates, getDocState, upsertDocState, mapDocState }
