/**
 * Spec Agent versioning logic.
 * Computes next version numbers and runs the atomic version creation transaction.
 */

const {
  createSpecVersion,
  setCurrentSpecVersion,
  getLatestSpecVersion,
  updateSpecSession,
} = require('../db/specQueries')

/**
 * Computes the next version numbers given the latest version and change type.
 * @param {object|null} latestVersion — mapped version object or null
 * @param {'initial'|'major'|'minor'|'patch'} changeType
 */
function getNextVersion(latestVersion, changeType) {
  if (!latestVersion) {
    return { major: 1, minor: 0, patch: 0, label: 'v1.0.0', isInitial: true }
  }

  let { versionMajor: major, versionMinor: minor, versionPatch: patch } = latestVersion

  switch (changeType) {
    case 'major':
      major += 1; minor = 0; patch = 0; break
    case 'minor':
      minor += 1; patch = 0; break
    case 'patch':
      patch += 1; break
    default:
      // treat unknown as minor
      minor += 1; patch = 0; break
  }

  return { major, minor, patch, label: `v${major}.${minor}.${patch}`, isInitial: false }
}

/**
 * Atomically creates a new spec version, sets it as current, and links it to the session.
 *
 * @param {import('pg').Pool} pool
 * @param {number} projectId
 * @param {number} sessionId
 * @param {object} session — full session object for context snapshot
 * @param {'initial'|'major'|'minor'|'patch'} changeType
 * @param {string} changeSummary
 * @param {object} generatedDocs — { docKey: { title, category, content, status, errorMessage, wordCount, generatedAt } }
 * @returns {Promise<object>} — the created spec_version mapped object
 */
async function createVersionTransaction(pool, projectId, sessionId, session, changeType, changeSummary, generatedDocs) {
  const latestVersion = await getLatestSpecVersion(pool, projectId)
  const { major, minor, patch, label } = getNextVersion(latestVersion, changeType)

  // Count successes and errors
  const docValues = Object.values(generatedDocs)
  const docCountSuccess = docValues.filter(d => d.status === 'done').length
  const docCountError = docValues.filter(d => d.status === 'error').length

  // Build session context snapshot
  const sessionContextSnapshot = {
    sessionName: session.name,
    phase: session.phase,
    messageCount: session.messageCount,
    checkpointCount: session.checkpointCount,
    elicitedSummaryJsonb: session.elicitedSummaryJsonb || null,
  }

  // Create the version record
  const version = await createSpecVersion(pool, {
    projectId,
    sessionId,
    major,
    minor,
    patch,
    label,
    changeType,
    changeSummary,
    docsSnapshot: generatedDocs,
    sessionContextSnapshot,
    docCountSuccess,
    docCountError,
  })

  // Set as current (handles the is_current flag swap + project pointer)
  await setCurrentSpecVersion(pool, projectId, version.id)

  // Link version back to session and mark session completed
  await updateSpecSession(pool, sessionId, {
    producedVersionId: version.id,
    status: 'completed',
    phase: 'completed',
  })

  // Re-fetch with is_current=true
  version.isCurrent = true
  return version
}

module.exports = { getNextVersion, createVersionTransaction }
