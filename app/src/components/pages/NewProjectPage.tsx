import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles, List, Check } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { useAIQuestionnaire } from '../../hooks/useAIQuestionnaire'
import { createProject, updateProject, listProjects, getQuestionInsights } from '../../api'
import type { QuestionInsights } from '../../api'
import { ProjectPotentialPanel } from '../ui/ProjectPotentialPanel'
import { filterQuestionsByDepth, getDepth } from '../../questions'
import { TEMPLATES } from '../../data/templates'
import type { Answers } from '../../types'
import type { AIQuestion } from '../../api'

type NewProjectPageProps = {
  loadProjects: () => void
}

type Mode = 'standard' | 'ai' | null

// Unified question shape for rendering (covers both static and AI questions)
type UnifiedQuestion = {
  id: string
  section?: string
  prompt: string
  type: 'text' | 'single' | 'multi'
  options?: { id: string; label: string }[]
  required?: boolean
  placeholder?: string
}

function isAnswered(q: UnifiedQuestion, answers: Answers): boolean {
  const value = answers[q.id]
  if (q.required === false) return true
  if (q.type === 'multi') return Array.isArray(value) && value.length > 0
  return typeof value === 'string' && value.trim().length > 0
}

function answerLabel(q: UnifiedQuestion, answers: Answers, customValues: Record<string, string> = {}): string {
  const value = answers[q.id]
  const customText = customValues[q.id]?.trim()

  if (q.type === 'multi') {
    const list = Array.isArray(value) ? (value as string[]) : []
    const parts = list
      .filter((id) => id !== '__custom__')
      .map((id) => q.options?.find((opt) => opt.id === id)?.label ?? id)
    if (customText) parts.push(customText)
    return parts.length ? parts.join(', ') : '-'
  }

  if (!value) return customText || '-'
  if (value === '__custom__') return customText || 'Other…'
  return q.options?.find((opt) => opt.id === value)?.label ?? String(value)
}

function toUnifiedQuestion(q: AIQuestion): UnifiedQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    options: q.options,
    required: true,
  }
}

export default function NewProjectPage({ loadProjects }: NewProjectPageProps) {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const toast = useToast()
  const ai = useAIQuestionnaire()

  const isEditMode = Boolean(id)

  // Mode: null = selecting, 'standard' = classic flow, 'ai' = AI-generated questions
  const [mode, setMode] = useState<Mode>(isEditMode ? 'standard' : null)

  // Steps:
  //   Standard: -1 = template select, 0+ = questions, N = summary
  //   AI:       -1 = AI setup (name/vision/depth), 0+ = questions, N = ai-review, N+1 = summary
  const [step, setStep] = useState<number>(isEditMode ? 0 : -1)

  const [answers, setAnswers] = useState<Answers>({ depth: 'basic' })
  const [isSaving, setIsSaving] = useState(false)
  const [aiReviewDone, setAIReviewDone] = useState(false)

  // Template hovered in standard mode template-selection screen
  const [hoveredTemplate, setHoveredTemplate] = useState<{ name: string; description: string; id: string } | null>(null)

  // Per-question AI insights: recommended ids + extra options
  const [insights, setInsights] = useState<Record<string, QuestionInsights>>({})
  // Which question is currently fetching AI insights
  const [loadingInsightsFor, setLoadingInsightsFor] = useState<string | null>(null)
  // Custom free-text values when user selects the "Custom" option
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Standard mode: static questions from questionnaire
  const staticQuestions: UnifiedQuestion[] = useMemo(
    () => filterQuestionsByDepth(answers) as UnifiedQuestion[],
    [answers],
  )

  // AI mode: generated questions
  const aiQuestions: UnifiedQuestion[] = useMemo(
    () => [
      // Seed with name/vision/depth from answers
      ...(ai.reviewResult?.followUpQuestions.map(toUnifiedQuestion) || []),
    ],
    [ai.reviewResult],
  )

  // Full AI question list: generated + any follow-ups
  const allAIQuestions: UnifiedQuestion[] = useMemo(() => {
    return ai.generatedQuestions.map(toUnifiedQuestion)
  }, [ai.generatedQuestions])

  // Derive active question list based on mode
  const activeQuestions: UnifiedQuestion[] = mode === 'ai' ? allAIQuestions : staticQuestions

  // In AI mode, the extra "AI Review" step is at index activeQuestions.length
  const aiReviewStep = mode === 'ai' ? activeQuestions.length : -1
  const summaryStep = mode === 'ai' ? activeQuestions.length + 1 : activeQuestions.length

  const isSummary = step >= summaryStep
  const isAIReviewStep = mode === 'ai' && step === aiReviewStep && !isSummary
  const currentQuestion =
    step >= 0 && step < activeQuestions.length ? activeQuestions[step] : null
  const totalSteps = activeQuestions.length + (mode === 'ai' ? 1 : 0) // +1 for AI review step

  // Base options + AI extra options appended
  const currentInsights = currentQuestion ? insights[currentQuestion.id] : null
  const baseOptions = currentQuestion?.options ?? []
  const extraOptions = currentInsights?.extra ?? []
  const recommendedIds = new Set(currentInsights?.recommended ?? [])
  // All options to display: original + AI extras
  const displayOptions = [...baseOptions, ...extraOptions]

  // Whether the "Custom…" pseudo-option is selected for the current question
  const isCustomSelected = !!currentQuestion && (
    currentQuestion.type === 'single'
      ? answers[currentQuestion.id] === '__custom__'
      : Array.isArray(answers[currentQuestion.id]) &&
        (answers[currentQuestion.id] as string[]).includes('__custom__')
  )

  const canContinue = (() => {
    if (!currentQuestion) return false
    const val = answers[currentQuestion.id]
    const customText = (customValues[currentQuestion.id] || '').trim()
    if (currentQuestion.type === 'text') return typeof val === 'string' && val.trim().length > 0
    if (currentQuestion.type === 'single') {
      if (val === '__custom__') return customText.length > 0
      return typeof val === 'string' && val.length > 0
    }
    if (currentQuestion.type === 'multi') {
      const hasSelected = Array.isArray(val) && (val as string[]).filter((v) => v !== '__custom__').length > 0
      return hasSelected || customText.length > 0
    }
    return false
  })()

  // Load project data in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return
    listProjects()
      .then((projects) => {
        const project = projects.find((p) => p.id === Number(id))
        if (project) {
          setAnswers({
            ...project.answers,
            depth: typeof project.answers?.depth === 'string' ? project.answers.depth : project.depth,
          })
          // If project has custom questions, enter AI mode with those questions loaded
          if (project.customQuestions && project.customQuestions.length > 0) {
            setMode('ai')
            ai.reset()
          } else {
            setMode('standard')
          }
          setStep(0)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode])

  // Auto-focus text inputs
  useEffect(() => {
    if (!currentQuestion) return
    const timer = setTimeout(() => {
      if (currentQuestion.type === 'text') textareaRef.current?.focus()
    }, 200)
    return () => clearTimeout(timer)
  }, [step, currentQuestion])

  // Select option without auto-advancing — user must click Continue
  const handleSingleSelect = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    },
    [],
  )

  // Fetch AI insights: which existing options are recommended + extra options to add
  async function fetchInsights(question: UnifiedQuestion) {
    if (loadingInsightsFor) return
    setLoadingInsightsFor(question.id)
    try {
      const projectName = typeof answers.project_name === 'string' ? answers.project_name : ''
      const vision = typeof answers.project_vision === 'string' ? answers.project_vision : ''
      const result = await getQuestionInsights({
        projectName,
        vision,
        questionPrompt: question.prompt,
        options: question.options,
        answers: answers as Record<string, unknown>,
      })
      setInsights((prev) => ({ ...prev, [question.id]: result }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoadingInsightsFor(null)
    }
  }

  // Run AI review when entering AI review step
  useEffect(() => {
    if (!isAIReviewStep || aiReviewDone || ai.isReviewing || ai.reviewResult) return
    const projectName =
      typeof answers.project_name === 'string' ? answers.project_name : 'Unnamed'
    const depth = typeof answers.depth === 'string' ? answers.depth : 'basic'
    const vision = typeof answers.project_vision === 'string' ? answers.project_vision : ''
    ai.runReview({
      projectName,
      depth,
      vision,
      questions: ai.generatedQuestions,
      answers: answers as Record<string, unknown>,
    }).then((result) => {
      if (result) {
        setAIReviewDone(true)
        // Append follow-up questions to the pool
        if (result.followUpQuestions.length > 0) {
          // Do NOT advance step — the user sees the review and clicks "Continue"
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIReviewStep])

  async function handleSave() {
    // Fold custom text into answers before saving
    const processedAnswers: Answers = { ...answers }
    for (const [qId, text] of Object.entries(customValues)) {
      const trimmed = text.trim()
      if (!trimmed) continue
      const val = processedAnswers[qId]
      if (val === '__custom__') {
        // Single-select "Other…" — replace sentinel with typed text
        processedAnswers[qId] = trimmed
      } else if (Array.isArray(val)) {
        // Multi-select — filter out any stale __custom__ then append custom text
        const filtered = (val as string[]).filter((v) => v !== '__custom__')
        processedAnswers[qId] = [...filtered, trimmed]
      } else if (!val) {
        // Multi with only custom text (nothing else selected)
        processedAnswers[qId] = [trimmed]
      }
    }

    // Final sanitization: remove any remaining __custom__ sentinels and non-string values
    for (const key of Object.keys(processedAnswers)) {
      const val = processedAnswers[key]
      if (val === '__custom__') {
        delete processedAnswers[key]
      } else if (Array.isArray(val)) {
        const filtered = (val as string[]).filter((v) => v !== '__custom__' && typeof v === 'string')
        if (filtered.length === 0) delete processedAnswers[key]
        else processedAnswers[key] = filtered
      } else if (typeof val !== 'string') {
        delete processedAnswers[key]
      }
    }

    const projectName =
      typeof processedAnswers.project_name === 'string' && processedAnswers.project_name.trim()
        ? processedAnswers.project_name.trim()
        : mode === 'ai' && ai.generatedQuestions.length > 0
          ? 'AI Project'
          : 'Untitled Project'

    const payload = {
      name: projectName,
      depth: getDepth(typeof processedAnswers.depth === 'string' ? processedAnswers.depth : undefined),
      vision: typeof processedAnswers.project_vision === 'string' ? processedAnswers.project_vision : '',
      answers: processedAnswers,
      customQuestions: mode === 'ai' ? ai.generatedQuestions : null,
    }
    setIsSaving(true)
    try {
      if (isEditMode && id) {
        await updateProject(Number(id), payload)
      } else {
        await createProject(payload)
      }
      await loadProjects()
      toast.success('Project saved!')
      navigate('/projects')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: Mode selector (step null and not edit mode)
  // ─────────────────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="p-5 md:p-8 max-w-2xl space-y-6">
        <h2 className={`text-3xl font-black ${theme.text}`}>New Project</h2>
        <p className={`${theme.textMuted} text-sm`}>
          Choose how you want to define this project.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Standard mode card */}
          <button
            onClick={() => {
              setMode('standard')
              setStep(-1)
            }}
            className={`text-left p-5 border-4 ${theme.border} ${theme.surface} hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-black shadow-[4px_4px_0_0_currentColor]`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 border-2 ${theme.border} flex items-center justify-center`}>
                <List size={16} className={theme.text} />
              </div>
              <p className={`font-black text-base ${theme.text}`}>Standard Questions</p>
            </div>
            <p className={`text-sm ${theme.textMuted}`}>
              Answer a structured set of questions about your project. Fast, guided, and
              predictable.
            </p>
            <p className={`text-xs mt-3 font-semibold ${theme.textMuted} uppercase`}>
              Choose template →
            </p>
          </button>

          {/* AI-Assisted mode card */}
          <button
            onClick={() => {
              setMode('ai')
              setStep(-1)
              ai.reset()
            }}
            className={`text-left p-5 border-4 border-black bg-yellow-300 text-black hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-black shadow-[4px_4px_0_0_currentColor]`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 border-2 border-black flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <p className="font-black text-base">AI-Assisted</p>
            </div>
            <p className="text-sm text-zinc-700">
              The AI generates a custom set of questions tailored to your project, then reviews
              your answers for completeness.
            </p>
            <p className="text-xs mt-3 font-semibold text-zinc-600 uppercase">
              Generate questions →
            </p>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: Standard mode — template selection (step === -1)
  // ─────────────────────────────────────────────────────────────
  if (mode === 'standard' && step === -1) {
    return (
      <div className="p-5 md:p-8 flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <button
            onClick={() => setMode(null)}
            className={`text-sm ${theme.textMuted} hover:underline focus-visible:ring-2 focus-visible:ring-black`}
          >
            ← Back
          </button>
          <h2 className={`text-3xl font-black ${theme.text}`}>New Project</h2>
        </div>

        {/* Two-column body */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px] gap-5">
          {/* ── Left: template grid ── */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            <p className={`text-sm ${theme.textMuted} flex-shrink-0`}>
              Hover a template to see its AI potential, then click to start.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {TEMPLATES.map((tmpl) => {
                const isHovered = hoveredTemplate?.id === tmpl.id
                return (
                  <button
                    key={tmpl.id}
                    onMouseEnter={() => setHoveredTemplate({ name: tmpl.name, description: tmpl.description, id: tmpl.id })}
                    onMouseLeave={() => {}}
                    onClick={() => {
                      setAnswers({ depth: 'basic', ...tmpl.answers })
                      setStep(0)
                    }}
                    className={`text-left p-4 border-4 ${theme.border} transition-all focus-visible:ring-2 focus-visible:ring-black shadow-[4px_4px_0_0_currentColor] ${
                      isHovered ? 'bg-yellow-300 text-black' : `${theme.surface} hover:opacity-90`
                    }`}
                  >
                    <p className={`font-black text-base ${isHovered ? 'text-black' : theme.text}`}>
                      {tmpl.name}
                    </p>
                    <p className={`text-sm mt-1 ${isHovered ? 'text-zinc-700' : theme.textMuted}`}>
                      {tmpl.description}
                    </p>
                    <p className={`text-xs mt-3 font-semibold uppercase ${isHovered ? 'text-zinc-600' : theme.textMuted}`}>
                      Use this template →
                    </p>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setStep(0)}
              className={`px-4 py-2 border-2 ${theme.border} ${theme.buttonGhost} font-semibold focus-visible:ring-2 focus-visible:ring-black self-start`}
            >
              Start Blank
            </button>
          </div>

          {/* ── Right: potential panel for hovered template ── */}
          {hoveredTemplate ? (
            <ProjectPotentialPanel
              projectName={hoveredTemplate.name}
              vision={hoveredTemplate.description}
              template={hoveredTemplate.id}
            />
          ) : (
            <div className={`flex flex-col items-center justify-center border-4 ${theme.border} ${theme.surface} p-6 text-center`}>
              <p className={`text-xs font-bold uppercase ${theme.textMuted} mb-1`}>AI Potential</p>
              <p className={`text-xs ${theme.textMuted}`}>
                Hover a template to see its AI build potential analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: AI mode — setup + question generation (step === -1)
  // ─────────────────────────────────────────────────────────────
  if (mode === 'ai' && step === -1) {
    const projectName = typeof answers.project_name === 'string' ? answers.project_name : ''
    const vision = typeof answers.project_vision === 'string' ? answers.project_vision : ''
    const depth = typeof answers.depth === 'string' ? answers.depth : 'basic'

    return (
      <div className="p-5 md:p-8 flex flex-col h-[calc(100vh-5rem)]">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-5 flex-shrink-0">
          <button
            onClick={() => setMode(null)}
            className={`text-sm ${theme.textMuted} hover:underline focus-visible:ring-2 focus-visible:ring-black`}
          >
            ← Back
          </button>
          <h2 className={`text-3xl font-black ${theme.text}`}>AI-Assisted Setup</h2>
        </div>

        {/* Two-column body */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px] gap-5">
          {/* ── Left: form ── */}
          <div className="flex flex-col space-y-4 overflow-y-auto pr-1">
            <p className={`text-sm ${theme.textMuted}`}>
              Enter basic project details — the AI will generate a tailored set of questions.
            </p>

            {/* Project name */}
            <div>
              <label className={`block text-xs font-black uppercase mb-1 ${theme.text}`}>
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setAnswers((prev) => ({ ...prev, project_name: e.target.value }))}
                placeholder="e.g. TaskFlow SaaS"
                className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
              />
            </div>

            {/* Vision */}
            <div>
              <label className={`block text-xs font-black uppercase mb-1 ${theme.text}`}>
                Project Vision *
              </label>
              <textarea
                rows={3}
                value={vision}
                onChange={(e) => setAnswers((prev) => ({ ...prev, project_vision: e.target.value }))}
                placeholder="e.g. A team task manager for remote-first startups"
                className={`w-full border-2 p-2 bg-transparent rounded-none resize-none ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
              />
            </div>

            {/* Depth */}
            <div>
              <label className={`block text-xs font-black uppercase mb-1 ${theme.text}`}>
                Questionnaire Depth
              </label>
              <div className="flex gap-2">
                {(['basic', 'intermediate', 'advanced'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setAnswers((prev) => ({ ...prev, depth: d }))}
                    className={`px-3 py-1.5 text-sm border-2 font-semibold capitalize focus-visible:ring-2 focus-visible:ring-black ${
                      depth === d ? theme.buttonPrimary : theme.buttonGhost
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {ai.error && (
              <p className="text-sm font-semibold text-red-600 border-2 border-red-400 p-2">
                {ai.error}
              </p>
            )}

            {/* Generate / status */}
            {ai.isGeneratingQuestions ? (
              <div className={`flex items-center gap-3 p-4 border-2 ${theme.border} ${theme.panelAlt}`}>
                <Loader2 size={18} className="animate-spin flex-shrink-0" />
                <p className={`text-sm font-semibold ${theme.text}`}>
                  AI is generating your personalized questions…
                </p>
              </div>
            ) : ai.generatedQuestions.length > 0 ? (
              <div className="space-y-3">
                <div className={`p-3 border-2 ${theme.border} ${theme.panelAlt} space-y-1`}>
                  <p className={`text-xs font-black uppercase ${theme.text}`}>
                    {ai.generatedQuestions.length} questions generated
                  </p>
                  {ai.generatedQuestions.slice(0, 5).map((q) => (
                    <p key={q.id} className={`text-xs ${theme.textMuted} truncate`}>
                      • {q.prompt}
                    </p>
                  ))}
                  {ai.generatedQuestions.length > 5 && (
                    <p className={`text-xs ${theme.textMuted}`}>
                      …and {ai.generatedQuestions.length - 5} more
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      ai.generateQuestions({ projectName, depth, vision })
                        .then((qs) => { if (qs.length > 0) setAIReviewDone(false) })
                    }
                    className={`px-3 py-2 border-2 text-sm ${theme.buttonGhost} focus-visible:ring-2 focus-visible:ring-black`}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => setStep(0)}
                    className={`px-4 py-2 border-2 text-sm font-bold ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black`}
                  >
                    Start Answering →
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() =>
                  ai.generateQuestions({ projectName, depth, vision })
                    .then((qs) => { if (qs.length > 0) setAIReviewDone(false) })
                }
                disabled={!projectName.trim() || !vision.trim()}
                className={`px-4 py-2 border-2 font-bold flex items-center gap-2 ${theme.buttonPrimary} disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-black`}
              >
                <Sparkles size={16} />
                Generate Questions
              </button>
            )}
          </div>

          {/* ── Right: AI potential panel ── */}
          <ProjectPotentialPanel
            projectName={projectName}
            vision={vision}
            template="AI-Assisted"
          />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: Main questionnaire (step >= 0) + summary
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 space-y-3">
      <div className="flex items-center gap-3">
        {mode === 'ai' && !isEditMode && (
          <button
            onClick={() => {
              setStep(-1)
              setAIReviewDone(false)
            }}
            className={`text-sm ${theme.textMuted} hover:underline focus-visible:ring-2 focus-visible:ring-black`}
          >
            ← Setup
          </button>
        )}
        <h2 className={`text-3xl font-black ${theme.text}`}>
          {isEditMode ? 'Edit Project' : 'New Project'}
          {mode === 'ai' && (
            <span className="ml-2 text-sm font-semibold text-yellow-600 border-2 border-yellow-400 px-2 py-0.5">
              AI-Assisted
            </span>
          )}
        </h2>
      </div>

      <div
        className={`border-4 ${theme.border} h-[calc(100vh-12rem)] grid grid-cols-[1fr_360px] gap-0 overflow-hidden shadow-[6px_6px_0_0_currentColor]`}
      >
        {/* Left: questionnaire */}
        <div className={`border-r-4 ${theme.border} flex flex-col min-h-0`}>
          <div
            className={`px-4 py-3 border-b-2 ${theme.border} flex items-center justify-between gap-3`}
          >
            <p className={`font-bold ${theme.text}`}>
              {isAIReviewStep ? 'AI Review' : isSummary ? 'Summary' : 'Questionnaire'}
            </p>
            <p className={`text-xs uppercase ${theme.textMuted}`}>
              {isSummary
                ? `Done · ${activeQuestions.length}/${activeQuestions.length}`
                : isAIReviewStep
                  ? `Review · ${activeQuestions.length}/${activeQuestions.length}`
                  : `Question ${step + 1} of ${activeQuestions.length}`}
            </p>
          </div>

          {/* Progress bar */}
          <div className={`px-4 py-2 border-b-2 ${theme.border} flex gap-1 flex-wrap`}>
            {activeQuestions.map((_, idx) => (
              <div
                key={idx}
                className={`w-4 h-4 border-2 ${theme.border} inline-block ${
                  idx < step ? 'bg-black' : idx === step ? 'bg-yellow-300' : theme.surface
                }`}
              />
            ))}
            {/* AI review step indicator */}
            {mode === 'ai' && (
              <div
                className={`w-4 h-4 border-2 border-black inline-block ${
                  isAIReviewStep ? 'bg-yellow-300' : isSummary ? 'bg-black' : theme.surface
                }`}
                title="AI Review"
              />
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {/* Normal question step */}
              {!isSummary && !isAIReviewStep && currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {currentQuestion.section && (
                    <p className={`text-xs uppercase ${theme.textMuted}`}>
                      {currentQuestion.section}
                    </p>
                  )}
                  <p className={`font-semibold ${theme.text}`}>{currentQuestion.prompt}</p>

                  {currentQuestion.type === 'text' && (
                    <textarea
                      ref={textareaRef}
                      rows={8}
                      value={
                        typeof answers[currentQuestion.id] === 'string'
                          ? (answers[currentQuestion.id] as string)
                          : ''
                      }
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }))
                      }
                      placeholder={currentQuestion.placeholder || ''}
                      className={`w-full border-2 rounded-none p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
                    />
                  )}

                  {(currentQuestion.type === 'single' || currentQuestion.type === 'multi') && (
                    <div className="space-y-2">
                      {/* Row: selection hint + AI insights button */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${theme.textMuted}`}>
                          {currentQuestion.type === 'multi'
                            ? '☑ Select all that apply'
                            : '○ Choose one'}
                        </p>
                        <button
                          onClick={() => fetchInsights(currentQuestion)}
                          disabled={!!loadingInsightsFor}
                          title="AI will flag the best options for your project and suggest extra ones"
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border-2 transition-colors focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 ${
                            currentInsights
                              ? 'bg-yellow-300 border-black text-black'
                              : `border-dashed ${theme.buttonGhost}`
                          }`}
                        >
                          {loadingInsightsFor === currentQuestion.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Sparkles size={10} />
                          )}
                          {loadingInsightsFor === currentQuestion.id
                            ? 'Thinking…'
                            : currentInsights
                              ? 'AI picks active'
                              : 'Get more options'}
                        </button>
                      </div>

                      {/* Options grid */}
                      <div className="grid gap-2">
                        {/* Base options (always shown) */}
                        {baseOptions.map((opt) => {
                          const isRecommended = recommendedIds.has(opt.id)
                          const selected =
                            currentQuestion.type === 'single'
                              ? answers[currentQuestion.id] === opt.id
                              : Array.isArray(answers[currentQuestion.id]) &&
                                (answers[currentQuestion.id] as string[]).includes(opt.id)
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                if (currentQuestion.type === 'single') {
                                  handleSingleSelect(currentQuestion.id, opt.id)
                                } else {
                                  setAnswers((prev) => {
                                    const existing = (Array.isArray(prev[currentQuestion.id])
                                      ? prev[currentQuestion.id] as string[]
                                      : []).filter((v) => v !== '__custom__')
                                    return {
                                      ...prev,
                                      [currentQuestion.id]: existing.includes(opt.id)
                                        ? existing.filter((i) => i !== opt.id)
                                        : [...existing, opt.id],
                                    }
                                  })
                                }
                              }}
                              className={`text-left px-3 py-2 border-2 transition-colors focus-visible:ring-2 focus-visible:ring-black flex items-center justify-between gap-2 ${
                                selected ? theme.buttonPrimary : theme.buttonGhost
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isRecommended && !selected && (
                                <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-yellow-300 text-black border border-black/30">
                                  ★ AI pick
                                </span>
                              )}
                            </button>
                          )
                        })}

                        {/* Extra AI-suggested options — appended after button click */}
                        {extraOptions.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 my-0.5">
                              <div className={`flex-1 border-t border-dashed ${theme.border}`} />
                              <span className={`text-[10px] font-bold uppercase ${theme.textMuted}`}>
                                More from AI
                              </span>
                              <div className={`flex-1 border-t border-dashed ${theme.border}`} />
                            </div>
                            {extraOptions.map((opt) => {
                              const selected =
                                currentQuestion.type === 'single'
                                  ? answers[currentQuestion.id] === opt.id
                                  : Array.isArray(answers[currentQuestion.id]) &&
                                    (answers[currentQuestion.id] as string[]).includes(opt.id)
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (currentQuestion.type === 'single') {
                                      handleSingleSelect(currentQuestion.id, opt.id)
                                    } else {
                                      setAnswers((prev) => {
                                        const existing = (Array.isArray(prev[currentQuestion.id])
                                          ? prev[currentQuestion.id] as string[]
                                          : []).filter((v) => v !== '__custom__')
                                        return {
                                          ...prev,
                                          [currentQuestion.id]: existing.includes(opt.id)
                                            ? existing.filter((i) => i !== opt.id)
                                            : [...existing, opt.id],
                                        }
                                      })
                                    }
                                  }}
                                  className={`text-left px-3 py-2 border-2 border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-black flex items-center justify-between gap-2 ${
                                    selected ? theme.buttonPrimary : theme.buttonGhost
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {!selected && (
                                    <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-yellow-300 text-black border border-black/30">
                                      ★ AI pick
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </>
                        )}

                        {/* ── Single-select: "Other…" expands to text input ── */}
                        {currentQuestion.type === 'single' && (
                          <>
                            <button
                              onClick={() => handleSingleSelect(currentQuestion.id, '__custom__')}
                              className={`text-left px-3 py-2 border-2 border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                                isCustomSelected ? theme.buttonPrimary : theme.buttonGhost
                              }`}
                            >
                              ✏️ Other… (specify)
                            </button>
                            {isCustomSelected && (
                              <input
                                autoFocus
                                type="text"
                                value={customValues[currentQuestion.id] || ''}
                                onChange={(e) =>
                                  setCustomValues((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                                }
                                placeholder="Describe your answer…"
                                className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
                              />
                            )}
                          </>
                        )}

                        {/* ── Multi-select: always-visible "Add custom" field ── */}
                        {currentQuestion.type === 'multi' && (
                          <div className={`flex items-center gap-2 border-2 border-dashed ${theme.border} px-3 py-2`}>
                            <span className={`text-xs flex-shrink-0 ${theme.textMuted}`}>✏️</span>
                            <input
                              type="text"
                              value={customValues[currentQuestion.id] || ''}
                              onChange={(e) =>
                                setCustomValues((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                              }
                              placeholder="Add custom answer…"
                              className={`flex-1 bg-transparent text-sm ${theme.text} focus:outline-none placeholder:text-zinc-400`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* AI Review step */}
              {isAIReviewStep && (
                <motion.div
                  key="ai-review"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {ai.isReviewing ? (
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin" />
                      <p className={`text-sm font-semibold ${theme.text}`}>
                        AI is reviewing your answers…
                      </p>
                    </div>
                  ) : ai.reviewResult ? (
                    <>
                      <div className={`p-3 border-2 ${theme.border} ${theme.panelAlt}`}>
                        <p className={`text-xs font-black uppercase mb-1 ${theme.text}`}>
                          Project Summary
                        </p>
                        <p className={`text-sm ${theme.text}`}>{ai.reviewResult.summary}</p>
                      </div>

                      {ai.reviewResult.followUpQuestions.length > 0 ? (
                        <div>
                          <p className={`text-xs font-black uppercase mb-2 ${theme.text}`}>
                            <Check size={12} className="inline mr-1" />
                            {ai.reviewResult.followUpQuestions.length} follow-up{' '}
                            {ai.reviewResult.followUpQuestions.length === 1
                              ? 'question'
                              : 'questions'}{' '}
                            added
                          </p>
                          <p className={`text-xs ${theme.textMuted}`}>
                            The AI identified gaps — the follow-up questions have been added to
                            your questionnaire. Click "Back" to answer them or proceed to
                            summary.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-lime-400 border-2 border-black flex-shrink-0" />
                          <p className={`text-sm font-semibold ${theme.text}`}>
                            Your answers look complete — no follow-up questions needed.
                          </p>
                        </div>
                      )}
                    </>
                  ) : ai.error ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-600">{ai.error}</p>
                      <button
                        onClick={() => {
                          setAIReviewDone(false)
                          ai.reset()
                        }}
                        className={`px-3 py-2 border-2 text-sm ${theme.buttonGhost} focus-visible:ring-2 focus-visible:ring-black`}
                      >
                        Retry Review
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {/* Summary step */}
              {isSummary && (
                <motion.div
                  key="summary-step"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {mode === 'ai' && ai.reviewResult && (
                    <div className={`p-3 border-2 ${theme.border} ${theme.panelAlt} mb-3`}>
                      <p className={`text-xs font-black uppercase mb-1 ${theme.text}`}>
                        AI Summary
                      </p>
                      <p className={`text-sm ${theme.text}`}>{ai.reviewResult.summary}</p>
                    </div>
                  )}
                  <p className={`text-sm ${theme.textMuted}`}>
                    Review your answers in the timeline, then save your project.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom navigation bar */}
          <div
            className={`sticky bottom-0 border-t-2 ${theme.border} ${theme.surface} p-3 flex gap-2`}
          >
            <button
              onClick={() => {
                const minStep = isEditMode ? 0 : -1
                setStep((s) => Math.max(minStep, s - 1))
              }}
              className={`px-3 py-2 border-2 ${theme.buttonGhost} focus-visible:ring-2 focus-visible:ring-black`}
            >
              Back
            </button>

            {isSummary ? (
              <>
                <button
                  onClick={() => setStep(step - 1)}
                  className={`px-3 py-2 border-2 ${theme.buttonGhost} focus-visible:ring-2 focus-visible:ring-black`}
                >
                  Edit Last
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-3 py-2 border-2 disabled:opacity-50 ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black`}
                >
                  {isSaving ? 'Saving…' : 'Save Project'}
                </button>
              </>
            ) : isAIReviewStep ? (
              <button
                onClick={() => setStep(summaryStep)}
                disabled={ai.isReviewing}
                className={`px-3 py-2 border-2 disabled:opacity-50 ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black`}
              >
                Continue to Summary
              </button>
            ) : (
              <button
                onClick={() =>
                  setStep((s) => Math.min(mode === 'ai' ? aiReviewStep : summaryStep, s + 1))
                }
                disabled={!canContinue}
                className={`px-3 py-2 border-2 disabled:opacity-50 ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black`}
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Right: summary timeline */}
        <div className={`p-3 min-h-0 overflow-y-auto ${theme.panelAlt}`}>
          <p className={`text-xs uppercase font-bold mb-2 ${theme.text}`}>Summary Timeline</p>
          <div className="relative">
            <div className="absolute left-2 top-1 bottom-1 w-[2px] bg-black/30" />
            <div className="space-y-2 pr-1">
              {activeQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setStep(idx)}
                  className={`w-full text-left pl-8 pr-2 py-2 relative transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                    step === idx ? 'bg-black/10' : 'hover:bg-black/5'
                  }`}
                >
                  <span className="absolute left-0.5 top-3 w-3 h-3 rounded-full bg-black border-2 border-yellow-300" />
                  <p className={`text-[11px] uppercase ${theme.textMuted}`}>
                    {q.section || `Step ${idx + 1}`}
                  </p>
                  <p className={`text-xs font-semibold ${theme.text}`}>{q.prompt}</p>
                  <p className={`text-xs ${theme.textMuted}`}>{answerLabel(q, answers, customValues)}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setStep(summaryStep)}
            className={`mt-3 w-full px-3 py-2 border-2 focus-visible:ring-2 focus-visible:ring-black ${
              isSummary ? theme.buttonPrimary : theme.buttonGhost
            }`}
          >
            Go To Summary
          </button>
        </div>
      </div>
    </div>
  )
}
