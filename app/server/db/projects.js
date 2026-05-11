/**
 * Maps a DB row to the public project shape.
 * @param {object} row
 */
function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    depth: row.depth,
    vision: row.vision,
    answers: row.answers || {},
    analysis: row.analysis || null,
    generatedPath: row.generated_path || null,
    generatedFiles: row.generated_files || [],
    customQuestions: row.custom_questions || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * @param {import('pg').Pool} pool
 */
async function listProjects(pool) {
  const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC')
  return result.rows.map(mapProject)
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} id
 */
async function getProjectById(pool, id) {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
  return result.rowCount ? mapProject(result.rows[0]) : null
}

/**
 * @param {import('pg').Pool} pool
 * @param {{ name: string, depth: string, vision?: string, answers?: object, customQuestions?: object[] | null }} data
 */
async function createProject(pool, data) {
  const { name, depth, vision, answers, customQuestions } = data
  let answersJson, customQuestionsJson
  try {
    answersJson = JSON.stringify(answers || {})
    customQuestionsJson = customQuestions != null ? JSON.stringify(customQuestions) : null
  } catch (e) {
    console.error('[createProject] JSON.stringify failed:', e)
    console.error('[createProject] answers:', answers)
    console.error('[createProject] customQuestions:', customQuestions)
    throw new Error('Failed to serialize project data: ' + e.message)
  }
  console.log('[createProject] answersJson type:', typeof answersJson, 'length:', answersJson.length)
  console.log('[createProject] customQuestionsJson type:', typeof customQuestionsJson)
  const result = await pool.query(
    `INSERT INTO projects (name, depth, vision, answers, custom_questions) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     RETURNING *`,
    [name, depth || 'advanced', vision || null, answersJson, customQuestionsJson],
  )
  return mapProject(result.rows[0])
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} id
 * @param {{ name: string, depth: string, vision?: string, answers?: object, customQuestions?: object[] | null }} data
 */
async function updateProject(pool, id, data) {
  const { name, depth, vision, answers, customQuestions } = data
  const answersJson = JSON.stringify(answers || {})
  const customQuestionsJson = customQuestions != null ? JSON.stringify(customQuestions) : null
  const result = await pool.query(
    `UPDATE projects
     SET name = $1, depth = $2, vision = $3, answers = $4::jsonb, custom_questions = $5::jsonb, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [name, depth, vision || null, answersJson, customQuestionsJson, id],
  )
  return result.rowCount ? mapProject(result.rows[0]) : null
}

/**
 * Saves a snapshot then deletes the project (CASCADE handles conversations).
 * @param {import('pg').Pool} pool
 * @param {number|string} id
 */
async function deleteProject(pool, id) {
  // Save snapshot before deletion
  const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id])
  if (projectResult.rowCount === 0) return false

  const row = projectResult.rows[0]
  await pool.query(
    `INSERT INTO project_snapshots (project_id, snapshot_type, analysis, generated_files)
     VALUES ($1, 'pre_delete', $2, $3)`,
    [id, row.analysis || null, JSON.stringify(row.generated_files || [])],
  )

  const del = await pool.query('DELETE FROM projects WHERE id = $1', [id])
  return del.rowCount > 0
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} id
 * @param {string} analysis
 */
async function updateProjectAnalysis(pool, id, analysis) {
  const result = await pool.query(
    'UPDATE projects SET analysis = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [analysis, id],
  )
  return result.rowCount ? mapProject(result.rows[0]) : null
}

/**
 * @param {import('pg').Pool} pool
 * @param {number|string} id
 * @param {string} outputDir
 * @param {string[]} files
 */
async function updateProjectFiles(pool, id, outputDir, files) {
  const result = await pool.query(
    `UPDATE projects
     SET generated_path = $1, generated_files = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [outputDir, JSON.stringify(files), id],
  )
  return result.rowCount ? mapProject(result.rows[0]) : null
}

module.exports = {
  mapProject,
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectAnalysis,
  updateProjectFiles,
}
