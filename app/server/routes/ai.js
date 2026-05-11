const express = require('express')
const { pool, state } = require('../db/pool')
const { getSettings } = require('../db/settings')
const { callOllama } = require('../lib/ollama')

const router = express.Router()

function respondDbUnavailable(res) {
  return res.status(503).json({ error: 'Database unavailable', code: 'DB_UNAVAILABLE' })
}

// ── JSON repair ───────────────────────────────────────────────────────────────
// LLMs frequently emit literal newlines / tabs / control chars inside string
// values, making the output unparseable. We use a character-by-character walk
// so we can precisely track string context and escape only within strings.

/**
 * Walk `src` char-by-char, find the outermost JSON object or array, and
 * return it as a substring. Returns null if no valid start is found.
 */
function extractJsonBlock(src) {
  const starters = ['{', '[']
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (!starters.includes(ch)) continue

    const open = ch
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inStr = false
    let escaped = false

    for (let j = i; j < src.length; j++) {
      const c = src[j]
      if (escaped) { escaped = false; continue }
      if (c === '\\' && inStr) { escaped = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === open) depth++
      else if (c === close) {
        depth--
        if (depth === 0) return src.slice(i, j + 1)
      }
    }
  }
  return null
}

/**
 * Walk the extracted JSON block char-by-char; when inside a string value,
 * replace literal control characters with their JSON escape sequences.
 * Returns the repaired string.
 */
function repairControlChars(block) {
  let out = ''
  let inStr = false
  let escaped = false

  for (let i = 0; i < block.length; i++) {
    const c = block[i]
    const code = c.charCodeAt(0)

    if (escaped) {
      out += c
      escaped = false
      continue
    }

    if (c === '\\' && inStr) {
      out += c
      escaped = true
      continue
    }

    if (c === '"') {
      inStr = !inStr
      out += c
      continue
    }

    if (inStr && code < 0x20) {
      // Literal control char inside a string — must be escaped
      if (c === '\n') out += '\\n'
      else if (c === '\r') out += '\\r'
      else if (c === '\t') out += '\\t'
      else out += '\\u' + code.toString(16).padStart(4, '0')
      continue
    }

    out += c
  }

  return out
}

function repairAndParseJson(raw) {
  // Strip markdown fences if present
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  for (const src of [raw, stripped]) {
    // 1. Try as-is (best case — model was well-behaved)
    try { return JSON.parse(src) } catch {}

    // 2. Extract outermost JSON block and try
    const block = extractJsonBlock(src)
    if (block) {
      try { return JSON.parse(block) } catch {}

      // 3. Repair literal control chars inside strings, then retry
      const repaired = repairControlChars(block)
      try { return JSON.parse(repaired) } catch {}
    }
  }

  return null
}

// ── POST /api/ai/generate-questions ──────────────────────────────────────────
// Body: { projectName, depth, vision, template }
// Returns: { questions: AIQuestion[] }
router.post('/api/ai/generate-questions', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const { projectName, depth, vision, template } = req.body
    const settings = await getSettings(pool, state)

    const prompt = `You are an expert product strategist generating a discovery questionnaire for a new software project.

Project Name: ${projectName || 'Unnamed'}
Depth: ${depth || 'advanced'}
Vision: ${vision || 'N/A'}
Template/Type: ${template || 'General'}

CONTEXT:
Many builders today are solo developers or non-technical founders using AI coding tools (Claude, Cursor, Copilot, etc.) — "vibe coding". In this mode the AI IS the developer. Questions about team size, sprint velocity, or DevOps pipelines are usually irrelevant. If the vision implies solo/AI-assisted work, adapt accordingly.

YOUR JOB:
Generate 10–20 questions that fully uncover the requirements for THIS specific project. Use your judgment: a simple CRUD app needs ~10 questions; a complex multi-tenant platform may need ~20. Always include a question about WHO is building it and HOW.

REQUIRED COVERAGE AREAS (adapt wording to the project):
1. Who is building it and with what tools
2. Primary user and the core problem being solved
3. Must-have features for the first working version (MVP scope)
4. Technology preferences or constraints
5. Data model — what gets stored, relationships, sensitive data
6. Authentication and access control
7. External services / APIs to integrate
8. Deployment target (web, mobile, desktop, internal, API-only)
9. Success metric — what "done" looks like
10. Hard constraints (deadline, budget, compliance, existing codebase)
Add more questions wherever the vision implies complexity (e.g. billing, notifications, multi-tenancy, offline support, i18n, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULE — PROJECT-SPECIFIC OPTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every single/multi question's options MUST be derived from the project name and vision.
Do NOT use generic, placeholder, or reusable options.

BAD (generic):
  Q: "Who is your target user?"
  options: ["Individual", "Small business", "Enterprise", "Other"]

GOOD (specific to a recipe-sharing app):
  Q: "Who is the primary audience for ${projectName || 'this app'}?"
  options: ["Home cooks looking for weeknight ideas", "Food bloggers monetising recipes", "Meal-prep enthusiasts", "Parents managing family dietary needs"]

BAD (generic tech):
  Q: "What database will you use?"
  options: ["SQL", "NoSQL", "Other"]

GOOD (specific to a real-time chat app):
  Q: "How will ${projectName || 'the app'} store messages and presence data?"
  options: ["PostgreSQL + Redis pub/sub", "Supabase Realtime", "Firebase Firestore", "PlanetScale + Pusher"]

Apply this same specificity to EVERY option in EVERY single/multi question.

Return ONLY a valid JSON array — no markdown fences, no explanation:
[
  {
    "id": "q_<unique-kebab-slug>",
    "prompt": "<clear, specific question referencing the project>",
    "type": "text" | "single" | "multi",
    "options": [{ "id": "opt_<slug>", "label": "<specific label>" }]
  }
]

Rules:
- "options" required for "single"/"multi"; empty array [] for "text"
- 4–6 options per single/multi question
- All ids must be globally unique
- Never use "Other", "N/A", "TBD", or placeholder labels in options`

    // Allow up to 2 attempts in case the model returns unparseable output once
    let parsed = null
    for (let attempt = 0; attempt < 2 && !Array.isArray(parsed); attempt++) {
      const raw = attempt === 0
        ? await callOllama(settings, prompt)
        : await callOllama(settings, prompt + '\n\nIMPORTANT: Your previous response could not be parsed. Return ONLY a raw JSON array — no prose, no markdown.')
      const candidate = repairAndParseJson(raw)
      // Accept array directly, or unwrap common wrapper shapes like { questions: [...] }
      if (Array.isArray(candidate)) {
        parsed = candidate
      } else if (candidate && typeof candidate === 'object') {
        const inner = candidate.questions ?? candidate.items ?? Object.values(candidate)[0]
        if (Array.isArray(inner)) parsed = inner
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI did not return a valid question list. Please try again.')
    }

    const questions = parsed.map((q, i) => ({
      id: q.id || `q_ai_${i}`,
      prompt: q.prompt || `Question ${i + 1}`,
      type: ['text', 'single', 'multi'].includes(q.type) ? q.type : 'text',
      options: Array.isArray(q.options) ? q.options : [],
    }))

    return res.json({ questions })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/ai/review-answers ───────────────────────────────────────────────
// Body: { projectName, depth, vision, questions, answers }
// Returns: { summary: string, followUpQuestions: AIQuestion[] }
router.post('/api/ai/review-answers', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const { projectName, depth, vision, questions, answers } = req.body
    const settings = await getSettings(pool, state)

    const qaText = (questions || [])
      .map((q) => {
        const answer = answers?.[q.id]
        const answerText = Array.isArray(answer)
          ? answer.join(', ')
          : answer || 'Not answered'
        return `Q: ${q.prompt}\nA: ${answerText}`
      })
      .join('\n\n')

    // Detect vibe-coding context from answers to guide review tone
    const answersStr = JSON.stringify(answers || {}).toLowerCase()
    const isVibeContext =
      answersStr.includes('ai') ||
      answersStr.includes('claude') ||
      answersStr.includes('cursor') ||
      answersStr.includes('solo') ||
      answersStr.includes('vibe') ||
      answersStr.includes('copilot') ||
      answersStr.includes('alone') ||
      answersStr.includes('just me') ||
      answersStr.includes('by myself')

    const prompt = `You are a senior product strategist reviewing a project specification questionnaire to ensure it is complete enough to build from.

Project Name: ${projectName}
Depth: ${depth}
Vision: ${vision || 'N/A'}
${isVibeContext ? '\nCONTEXT: This appears to be a solo builder / AI-assisted (vibe coding) project. Adjust your review accordingly — focus on clarity for an AI coding agent, not team workflows or enterprise concerns.' : ''}

Questions & Answers:
${qaText}

Your task:
1. Write a clear "summary" (2-4 sentences) of what is being built, who it is for, how it will be built, and what success looks like. Be specific — mention the tech approach, user type, and core purpose.
${isVibeContext ? '   For vibe-coding projects: emphasise what an AI coding agent needs to know — data model, auth approach, key screens/endpoints, and deployment target.' : ''}
2. Identify CRITICAL gaps — missing information that would block a developer (or AI coding agent) from starting work. Generate 0-4 "followUpQuestions" only for genuine blockers. If the spec is complete enough to start, return an empty array.

${isVibeContext ? `Gaps that matter for AI-assisted projects:
- Unclear data model or storage approach
- No auth/access control decision
- Ambiguous core feature scope (what is IN vs OUT of v1)
- No deployment target specified
- Tech stack not decided (which matters for code generation)
Do NOT ask about: team structure, project management, hiring, enterprise compliance, budget approval processes.` : `Gaps that matter:
- Unclear core feature scope
- No tech stack or architecture decision
- Missing auth / access control plan
- No deployment or infrastructure plan
- Ambiguous success criteria`}

Return ONLY a valid JSON object — no markdown, no preamble, no trailing text:
{
  "summary": "<2-4 sentence project summary>",
  "followUpQuestions": [
    {
      "id": "fu_<unique-kebab-slug>",
      "prompt": "<specific, actionable gap question>",
      "type": "text" | "single" | "multi",
      "options": [{ "id": "opt_<slug>", "label": "<label>" }]
    }
  ]
}

Rules:
- "options" must be [] for type "text"
- 3-5 options for "single"/"multi"
- All ids must be unique
- Only ask follow-up questions for genuine blocking gaps`

    let parsed = null
    for (let attempt = 0; attempt < 2 && (!parsed || !parsed.summary); attempt++) {
      const raw = attempt === 0
        ? await callOllama(settings, prompt)
        : await callOllama(settings, prompt + '\n\nIMPORTANT: Your previous response could not be parsed. Return ONLY a raw JSON object with "summary" and "followUpQuestions" keys — no prose, no markdown.')
      parsed = repairAndParseJson(raw)
    }

    if (!parsed || !parsed.summary) {
      throw new Error('AI review did not return a valid response. Please try again.')
    }

    const followUpQuestions = Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.map((q, i) => ({
          id: q.id || `fu_${i}`,
          prompt: q.prompt || `Follow-up ${i + 1}`,
          type: ['text', 'single', 'multi'].includes(q.type) ? q.type : 'text',
          options: Array.isArray(q.options) ? q.options : [],
        }))
      : []

    return res.json({ summary: parsed.summary, followUpQuestions })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/ai/question-insights ───────────────────────────────────────────
// Body: { projectName, vision, questionPrompt, options, answers }
// Returns: { recommended: string[], extra: { id, label }[] }
//   recommended — ids of existing options that best suit this project
//   extra       — 2-3 additional options not already in the list
router.post('/api/ai/question-insights', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const { projectName, vision, questionPrompt, options, answers } = req.body
    const settings = await getSettings(pool, state)

    const answersContext = Object.entries(answers || {})
      .filter(([k, v]) => v && k !== 'depth')
      .map(([, v]) => (Array.isArray(v) ? v.join(', ') : String(v)))
      .slice(0, 8)
      .join(' | ')

    const optionsList = (options || [])
      .map((o) => `  { "id": "${o.id}", "label": "${o.label}" }`)
      .join('\n')

    const prompt = `You are helping a user choose the best answer for a project discovery question.

Project: ${projectName || 'Unnamed'}
Vision: ${vision || 'N/A'}
Context from prior answers: ${answersContext || 'none'}

Question: ${questionPrompt}

Current options:
${optionsList || '  (none)'}

Your tasks:
1. From the current options, pick 1-3 ids that are the BEST fit for this specific project. Return them in "recommended".
2. Suggest 2-3 ADDITIONAL options that are NOT in the current list but would be relevant for this project. Be specific to the project context — no generic labels. Return them in "extra".

Return ONLY a valid JSON object, no markdown:
{
  "recommended": ["<existing-opt-id>"],
  "extra": [{ "id": "opt_<slug>", "label": "<concise label>" }]
}`

    const raw = await callOllama(settings, prompt)
    const parsed = repairAndParseJson(raw)

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI did not return valid insights. Please try again.')
    }

    return res.json({
      recommended: Array.isArray(parsed.recommended) ? parsed.recommended.filter(Boolean) : [],
      extra: Array.isArray(parsed.extra)
        ? parsed.extra.map((o, i) => ({
            id: o.id || `opt_extra_${i}`,
            label: o.label || `Option ${i + 1}`,
          }))
        : [],
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/ai/project-potential ───────────────────────────────────────────
// Body: { projectName, vision, template }
// Returns: { tagline, overview, features, targetUser, techStack, firstMilestone }
// Generates a realistic project sample — what this project could actually be.
router.post('/api/ai/project-potential', async (req, res, next) => {
  if (!state.dbReady) return respondDbUnavailable(res)
  try {
    const { projectName, vision, template } = req.body
    const settings = await getSettings(pool, state)

    const prompt = `You are a product designer generating a realistic project brief for a software project.

Project Name: ${projectName || 'Unnamed'}
Vision: ${vision || 'N/A'}
Type: ${template || 'General'}

Write a concrete, specific project sample that shows what this project could actually be when built with AI assistance. Make it feel real — use specific feature names, real technology names, and concrete user descriptions. Do NOT be generic.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "tagline": "<one punchy sentence — the project's value proposition>",
  "overview": "<2-3 sentences describing exactly what the product does, who uses it, and why it matters>",
  "features": [
    "<specific feature with a concrete name>",
    "<specific feature>",
    "<specific feature>",
    "<specific feature>"
  ],
  "targetUser": "<specific description of the primary user — not 'users' but e.g. 'Freelance designers who invoice 10+ clients a month'>",
  "techStack": "<one sentence naming the specific tech approach — e.g. Next.js 14 + Supabase for auth and real-time, deployed on Vercel>",
  "firstMilestone": "<one sentence describing the very first working version — what it does, how long it takes with AI>"
}

Rules:
- Make features sound like real product features, not categories (e.g. "Drag-drop Kanban with swimlanes" not "Task management")
- Tech stack must be specific tools, not categories (e.g. "PostgreSQL + Prisma" not "a database")
- firstMilestone must include a concrete time estimate`

    const raw = await callOllama(settings, prompt)
    const parsed = repairAndParseJson(raw)

    if (!parsed || !parsed.overview) {
      throw new Error('Could not generate project sample.')
    }

    return res.json({
      tagline: String(parsed.tagline || ''),
      overview: String(parsed.overview || ''),
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 6).map(String) : [],
      targetUser: String(parsed.targetUser || ''),
      techStack: String(parsed.techStack || ''),
      firstMilestone: String(parsed.firstMilestone || ''),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
