/**
 * Database query functions for Spec Agent — sessions, messages, versions.
 * Follows the same pattern as conversations.js and docs.js.
 */

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapSession(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    status: row.status,
    phase: row.phase,
    producedVersionId: row.produced_version_id,
    elicitedSummary: row.elicited_summary,
    elicitedSummaryJsonb: row.elicited_summary_jsonb,
    checkpointCount: row.checkpoint_count,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    messageType: row.message_type,
    phaseAtSend: row.phase_at_send,
    createdAt: row.created_at,
  }
}

function mapVersion(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    versionMajor: row.version_major,
    versionMinor: row.version_minor,
    versionPatch: row.version_patch,
    versionLabel: row.version_label,
    changeType: row.change_type,
    changeSummary: row.change_summary,
    docsSnapshot: row.docs_snapshot,
    sessionContextSnapshot: row.session_context_snapshot,
    isCurrent: row.is_current,
    docCountSuccess: row.doc_count_success,
    docCountError: row.doc_count_error,
    createdAt: row.created_at,
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function createSpecSession(pool, projectId, name) {
  const result = await pool.query(
    `INSERT INTO spec_sessions (project_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [projectId, name || 'New Session'],
  )
  return mapSession(result.rows[0])
}

async function listSpecSessions(pool, projectId, statusFilter) {
  const validFilters = ['active', 'archived', 'completed']
  const useFilter = statusFilter && validFilters.includes(statusFilter)
  const result = await pool.query(
    useFilter
      ? `SELECT * FROM spec_sessions WHERE project_id = $1 AND status = $2 ORDER BY updated_at DESC, id DESC`
      : `SELECT * FROM spec_sessions WHERE project_id = $1 ORDER BY updated_at DESC, id DESC`,
    useFilter ? [projectId, statusFilter] : [projectId],
  )
  return result.rows.map(mapSession)
}

async function getSpecSession(pool, sessionId) {
  const result = await pool.query(
    'SELECT * FROM spec_sessions WHERE id = $1',
    [sessionId],
  )
  return result.rows[0] ? mapSession(result.rows[0]) : null
}

async function getSpecSessionWithMessages(pool, sessionId) {
  const sessionResult = await pool.query(
    'SELECT * FROM spec_sessions WHERE id = $1',
    [sessionId],
  )
  if (!sessionResult.rows[0]) return null
  const session = mapSession(sessionResult.rows[0])

  const messagesResult = await pool.query(
    `SELECT * FROM spec_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC`,
    [sessionId],
  )
  session.messages = messagesResult.rows.map(mapMessage)
  return session
}

async function updateSpecSession(pool, sessionId, fields) {
  const allowed = ['name', 'status', 'phase', 'elicited_summary', 'elicited_summary_jsonb', 'checkpoint_count', 'message_count', 'produced_version_id']
  const setClauses = []
  const values = []
  let idx = 1

  const colMap = {
    name: 'name',
    status: 'status',
    phase: 'phase',
    elicitedSummary: 'elicited_summary',
    elicitedSummaryJsonb: 'elicited_summary_jsonb',
    checkpointCount: 'checkpoint_count',
    messageCount: 'message_count',
    producedVersionId: 'produced_version_id',
  }

  for (const [key, col] of Object.entries(colMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${col} = $${idx}`)
      values.push(fields[key])
      idx++
    }
  }

  if (setClauses.length === 0) return getSpecSession(pool, sessionId)

  setClauses.push(`updated_at = NOW()`)
  values.push(sessionId)

  const result = await pool.query(
    `UPDATE spec_sessions SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  )
  return result.rows[0] ? mapSession(result.rows[0]) : null
}

async function deleteSpecSession(pool, sessionId) {
  await pool.query('DELETE FROM spec_sessions WHERE id = $1', [sessionId])
}

// ── Messages ──────────────────────────────────────────────────────────────────

async function insertSpecMessage(pool, sessionId, role, content, messageType, phaseAtSend) {
  const result = await pool.query(
    `INSERT INTO spec_messages (session_id, role, content, message_type, phase_at_send)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, role, content, messageType || 'chat', phaseAtSend || null],
  )
  // Increment message_count on the session
  await pool.query(
    `UPDATE spec_sessions SET message_count = message_count + 1, updated_at = NOW() WHERE id = $1`,
    [sessionId],
  )
  return mapMessage(result.rows[0])
}

async function getSpecMessages(pool, sessionId, limit, offset) {
  const result = await pool.query(
    `SELECT * FROM spec_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC LIMIT $2 OFFSET $3`,
    [sessionId, limit || 200, offset || 0],
  )
  return result.rows.map(mapMessage)
}

/**
 * Returns the last N messages within a character budget, newest-first then reversed to chronological.
 */
async function getSpecMessageHistory(pool, sessionId, charBudget, msgLimit) {
  const result = await pool.query(
    `SELECT role, content, phase_at_send FROM spec_messages
     WHERE session_id = $1 AND role IN ('user', 'assistant')
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [sessionId, msgLimit || 30],
  )
  const kept = []
  let total = 0
  for (const row of result.rows) {
    if (total + row.content.length > (charBudget || 20000)) break
    kept.push(row)
    total += row.content.length
  }
  kept.reverse()
  return kept
}

// ── Versions ──────────────────────────────────────────────────────────────────

async function createSpecVersion(pool, versionData) {
  const {
    projectId, sessionId, major, minor, patch, label,
    changeType, changeSummary, docsSnapshot, sessionContextSnapshot,
    docCountSuccess, docCountError,
  } = versionData

  const result = await pool.query(
    `INSERT INTO spec_versions
       (project_id, session_id, version_major, version_minor, version_patch,
        version_label, change_type, change_summary, docs_snapshot,
        session_context_snapshot, doc_count_success, doc_count_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      projectId, sessionId || null, major, minor, patch,
      label, changeType, changeSummary || null,
      JSON.stringify(docsSnapshot),
      sessionContextSnapshot ? JSON.stringify(sessionContextSnapshot) : null,
      docCountSuccess || 0, docCountError || 0,
    ],
  )
  return mapVersion(result.rows[0])
}

async function listSpecVersions(pool, projectId) {
  const result = await pool.query(
    `SELECT id, project_id, session_id, version_major, version_minor, version_patch,
            version_label, change_type, change_summary, is_current,
            doc_count_success, doc_count_error, created_at
     FROM spec_versions
     WHERE project_id = $1
     ORDER BY created_at DESC, id DESC`,
    [projectId],
  )
  return result.rows.map(mapVersion)
}

async function getSpecVersion(pool, versionId) {
  const result = await pool.query(
    'SELECT * FROM spec_versions WHERE id = $1',
    [versionId],
  )
  return result.rows[0] ? mapVersion(result.rows[0]) : null
}

async function getLatestSpecVersion(pool, projectId) {
  const result = await pool.query(
    `SELECT * FROM spec_versions WHERE project_id = $1 AND is_current = TRUE LIMIT 1`,
    [projectId],
  )
  if (result.rows[0]) return mapVersion(result.rows[0])
  // fallback: most recent by date
  const fallback = await pool.query(
    `SELECT * FROM spec_versions WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId],
  )
  return fallback.rows[0] ? mapVersion(fallback.rows[0]) : null
}

/**
 * Atomically promotes a version to current.
 * Uses a single transaction client.
 */
async function setCurrentSpecVersion(pool, projectId, versionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Clear current flag on all versions for this project
    await client.query(
      `UPDATE spec_versions SET is_current = FALSE WHERE project_id = $1`,
      [projectId],
    )
    // Set new current
    await client.query(
      `UPDATE spec_versions SET is_current = TRUE WHERE id = $1`,
      [versionId],
    )
    // Update project pointer
    await client.query(
      `UPDATE projects SET current_spec_version_id = $1 WHERE id = $2`,
      [versionId, projectId],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  // sessions
  createSpecSession,
  listSpecSessions,
  getSpecSession,
  getSpecSessionWithMessages,
  updateSpecSession,
  deleteSpecSession,
  // messages
  insertSpecMessage,
  getSpecMessages,
  getSpecMessageHistory,
  // versions
  createSpecVersion,
  listSpecVersions,
  getSpecVersion,
  getLatestSpecVersion,
  setCurrentSpecVersion,
}
