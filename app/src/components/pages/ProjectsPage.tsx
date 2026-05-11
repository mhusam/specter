import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FolderKanban,
  Trash2,
  Loader2,
  ChevronRight,
  Download,
  X,
  Check,
  MessageSquare,
  LayoutList,
  FileText,
  Bot,
  Sparkles,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { useConversations } from '../../hooks/useConversations'
import { useDocGeneration } from '../../hooks/useDocGeneration'
import {
  analyzeProject,
  deleteProject,
  getProjectFiles,
  streamGenerateFiles,
  downloadProjectZip,
} from '../../api'
import { filterQuestionsByDepth } from '../../questions'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { EmptyState } from '../ui/EmptyState'
import { ProjectListSkeleton } from '../ui/Skeleton'
import { FileViewer } from '../ui/FileViewer'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
import { DocCategoryViewer } from '../ui/DocCategoryViewer'
import { SpecTab } from '../spec/SpecTab'
import { VersionSelector } from '../spec/VersionSelector'
import { useSpecVersions } from '../../hooks/useSpecVersions'
import { timeAgo } from '../../utils'
import type { Project, Answers } from '../../types'
import type { DocCategory, DocState } from '../../types/docs'
import type { SpecDocSnapshot } from '../../types/spec'

type Tab = 'overview' | 'docs' | 'chat' | 'spec'

type ProjectsPageProps = {
  projects: Project[]
  isLoading: boolean
  loadProjects: () => void
}

type GenerateProgress = {
  file: string
  done: number
  total: number
}

function answerLabel(
  q: { type: string; options?: { id: string; label: string }[] },
  answers: Answers,
  id: string,
): string {
  const value = answers[id]
  if (!value) return '-'
  if (q.type === 'multi') {
    const list = Array.isArray(value) ? value : []
    return list.map((item) => q.options?.find((opt) => opt.id === item)?.label ?? item).join(', ')
  }
  return q.options?.find((opt) => opt.id === value)?.label ?? String(value)
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-1">
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
    </div>
  )
}

const SPEC_CATEGORY_ORDER = [
  'navigation', 'product', 'requirements', 'architecture',
  'backend', 'frontend', 'security', 'delivery', 'quality',
  'reference', 'versioning', 'ai-context',
]
const SPEC_CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  product: 'Product',
  requirements: 'Requirements',
  architecture: 'Architecture',
  backend: 'Backend',
  frontend: 'Frontend',
  security: 'Security',
  delivery: 'Delivery',
  quality: 'Quality',
  reference: 'Reference',
  versioning: 'Versioning',
  'ai-context': 'AI Context',
}

function snapshotToDocCategories(
  snapshot: Record<string, SpecDocSnapshot>,
  projectId: number,
): DocCategory[] {
  const byCategory: Record<string, DocState[]> = {}
  for (const [docKey, snap] of Object.entries(snapshot)) {
    const cat = snap.category || 'reference'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push({
      id: 0,
      projectId,
      docKey,
      category: cat,
      title: snap.title || docKey,
      status: snap.status === 'done' ? 'done' : 'error',
      content: snap.content,
      errorMessage: snap.errorMessage,
      generatedAt: snap.generatedAt,
    })
  }
  const knownOrder = SPEC_CATEGORY_ORDER.filter(cat => byCategory[cat]?.length)
  const rest = Object.keys(byCategory).filter(cat => !SPEC_CATEGORY_ORDER.includes(cat))
  return [...knownOrder, ...rest].map(cat => ({
    key: cat,
    label: SPEC_CATEGORY_LABELS[cat] || cat,
    docs: (byCategory[cat] ?? []).sort((a, b) => a.docKey.localeCompare(b.docKey)),
  }))
}

export default function ProjectsPage({ projects, isLoading, loadProjects }: ProjectsPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme } = useTheme()
  const toast = useToast()

  // --- Project selection ---
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return (t === 'spec' || t === 'docs' || t === 'chat' || t === 'overview') ? t as Tab : 'overview'
  })

  // --- Overview tab state ---
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState<{ name: string; content: string }[]>([])
  const [generateProgress, setGenerateProgress] = useState<GenerateProgress | null>(null)
  const [progressFiles, setProgressFiles] = useState<string[]>([])

  // --- Docs tab state ---
  const docGen = useDocGeneration()
  const [selectedSpecVersionId, setSelectedSpecVersionId] = useState<number | null>(null)
  const specVersions = useSpecVersions(activeProject?.id ?? 0)

  // --- Chat tab state ---
  const {
    messages,
    chatInput,
    setChatInput,
    isStreaming,
    liveReply,
    loadConversation,
    sendChatMessage,
    generateReport,
    clearConversations,
  } = useConversations()
  const [confirmClear, setConfirmClear] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeTab !== 'chat') return
    const frame = requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(frame)
  }, [messages, liveReply, isStreaming, activeTab])

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // --- Project selection ---
  const loadFilesForProject = useCallback(async (project: Project) => {
    if (project.generatedFiles && project.generatedFiles.length > 0) {
      try {
        const data = await getProjectFiles(project.id)
        setGeneratedFiles(data.files)
      } catch {
        setGeneratedFiles([])
      }
    } else {
      setGeneratedFiles([])
    }
  }, [])

  async function selectProject(project: Project) {
    setActiveProject(project)
    setConfirmDelete(false)
    setConfirmClear(false)
    setGenerateProgress(null)
    setProgressFiles([])
    setActiveTab('overview')
    setSelectedSpecVersionId(null)
    specVersions.setSelectedVersion(null)
    loadFilesForProject(project)
    docGen.loadDocs(project.id)
    specVersions.loadVersions()
    try {
      await loadConversation(project.id)
    } catch {
      // non-fatal
    }
  }

  // --- Overview actions ---
  async function handleAnalyze() {
    if (!activeProject) return
    setIsAnalyzing(true)
    try {
      const updated = await analyzeProject(activeProject.id)
      setActiveProject(updated)
      await loadProjects()
      toast.success('Analysis complete!')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleGenerateFiles() {
    if (!activeProject) return
    setIsGenerating(true)
    setGenerateProgress(null)
    setProgressFiles([])
    setGeneratedFiles([])
    try {
      await streamGenerateFiles(activeProject.id, {
        onProgress: (data) => {
          setGenerateProgress(data)
          setProgressFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]))
        },
        onDone: async (project) => {
          setActiveProject(project)
          await loadProjects()
          try {
            const files = await getProjectFiles(project.id)
            setGeneratedFiles(files.files)
          } catch {
            // ignore
          }
        },
      })
      toast.success('Files generated!')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsGenerating(false)
      setGenerateProgress(null)
    }
  }

  async function handleDelete() {
    if (!activeProject) return
    setIsDeletingProject(true)
    try {
      await deleteProject(activeProject.id)
      setActiveProject(null)
      setGeneratedFiles([])
      await loadProjects()
      setConfirmDelete(false)
      toast.success('Project deleted.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsDeletingProject(false)
    }
  }

  async function handleExportZip() {
    if (!activeProject) return
    try {
      await downloadProjectZip(activeProject.id, activeProject.name)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // --- Chat actions ---
  const handleSend = useCallback(async () => {
    if (!activeProject || !chatInput.trim() || isStreaming) return
    try {
      await sendChatMessage(activeProject.id, chatInput)
    } catch (e) {
      toast.error((e as Error).message)
    }
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [activeProject, chatInput, isStreaming, sendChatMessage, toast])

  async function handleGenerateReport() {
    if (!activeProject) return
    try {
      await generateReport(activeProject.id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleClearHistory() {
    if (!activeProject) return
    setIsClearing(true)
    try {
      await clearConversations(activeProject.id)
      setConfirmClear(false)
      toast.success('Conversation cleared.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setIsClearing(false)
    }
  }

  function handleTextareaInput(e: FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const activeAnswers = activeProject ? activeProject.answers : {}
  const isAIProject = !!(activeProject?.customQuestions && activeProject.customQuestions.length > 0)
  const activeQuestions = activeProject
    ? isAIProject
      ? activeProject.customQuestions!
      : filterQuestionsByDepth({
          ...activeProject.answers,
          depth:
            typeof activeProject.answers?.depth === 'string'
              ? activeProject.answers.depth
              : activeProject.depth,
        })
    : []

  const total = generateProgress?.total ?? 0
  const done = generateProgress?.done ?? 0

  // Tab style helpers
  function tabClass(tab: Tab) {
    const active = activeTab === tab
    return [
      'flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 transition-colors focus-visible:ring-2 focus-visible:ring-black',
      active
        ? `${theme.border} bg-pink-400 text-black border-b-0 -mb-[2px] relative z-10`
        : `${theme.border} ${theme.surface} ${theme.textMuted} border-b-0 opacity-60 hover:opacity-90`,
    ].join(' ')
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-hidden grid grid-cols-[280px_1fr]">

        {/* ── Left: project list ── */}
        <div className={`border-r-4 ${theme.border} ${theme.surface} flex flex-col`}>
          <div className={`p-2 border-b-2 ${theme.border}`}>
            <input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-1.5 text-sm border-2 ${theme.border} ${theme.surface} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && projects.length === 0 ? (
              <ProjectListSkeleton />
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-3">
                <p className={`text-sm ${theme.textMuted} font-semibold`}>
                  {searchQuery
                    ? 'No projects match your search.'
                    : 'No projects yet. Add one with the + button.'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isActive = activeProject?.id === project.id
                const hasFiles = project.generatedFiles && project.generatedFiles.length > 0
                return (
                  <button
                    key={project.id}
                    onClick={() => selectProject(project)}
                    className={`w-full text-left px-4 py-3 border-b-2 ${theme.border} transition-colors ${
                      isActive
                        ? 'bg-yellow-200 text-black'
                        : `${theme.surface} ${theme.text} hover:opacity-80`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex-shrink-0 w-2 h-2 rounded-full ${
                          hasFiles
                            ? 'bg-lime-500'
                            : project.analysis
                              ? 'bg-sky-400'
                              : 'bg-zinc-400'
                        }`}
                      />
                      <p className="font-semibold truncate flex-1">{project.name}</p>
                      {project.customQuestions && project.customQuestions.length > 0 && (
                        <span className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-black uppercase bg-yellow-300 text-black border border-black/30 leading-none">
                          <Sparkles size={8} />
                          AI
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ml-4 ${isActive ? 'text-zinc-700' : theme.textMuted}`}
                    >
                      {project.depth}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: detail + chat ── */}
        <div className="flex flex-col h-full overflow-hidden">
          {!activeProject ? (
            <EmptyState
              icon={<FolderKanban size={22} />}
              message="Select a project to view details and chat."
            />
          ) : (
            <>
              {/* Project header */}
              <div className={`flex-shrink-0 px-4 pt-4 pb-0 ${theme.surface} border-b-0`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <p className={`text-2xl font-black ${theme.text}`}>{activeProject.name}</p>
                    <p className={`text-sm ${theme.textMuted}`}>
                      {activeProject.vision || 'No vision provided.'}
                    </p>
                  </div>

                  {/* Action buttons — always visible regardless of tab */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/projects/${activeProject.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || isGenerating}
                      className="flex items-center gap-1"
                    >
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : null}
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleGenerateFiles}
                      disabled={isGenerating || isAnalyzing || docGen.isGenerating}
                      className="flex items-center gap-1"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : null}
                      {isGenerating ? 'Generating...' : 'Legacy Files'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => activeProject && docGen.generateAll(activeProject.id)}
                      disabled={docGen.isGenerating || isAnalyzing || isGenerating}
                      className="flex items-center gap-1"
                    >
                      {docGen.isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      {docGen.isGenerating ? 'Generating Docs...' : 'Generate Docs'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleExportZip}
                      disabled={!activeProject.generatedFiles?.length}
                      className="flex items-center gap-1"
                    >
                      <Download size={14} />
                      Export ZIP
                    </Button>
                    {!confirmDelete ? (
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    ) : (
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 border-2 ${theme.border} ${theme.surface}`}
                      >
                        <span className={`text-sm font-semibold ${theme.text}`}>Sure?</span>
                        <button
                          onClick={handleDelete}
                          disabled={isDeletingProject}
                          className="w-6 h-6 flex items-center justify-center bg-red-400 border border-black focus-visible:ring-2 focus-visible:ring-black"
                          aria-label="Confirm delete"
                        >
                          {isDeletingProject ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="w-6 h-6 flex items-center justify-center bg-zinc-200 border border-black focus-visible:ring-2 focus-visible:ring-black"
                          aria-label="Cancel delete"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab bar */}
                <div className={`flex border-b-2 ${theme.border}`}>
                  <button onClick={() => { setActiveTab('overview'); setSearchParams(p => { p.delete('tab'); p.delete('session'); return p }) }} className={tabClass('overview')}>
                    <LayoutList size={14} />
                    Overview
                  </button>
                  <button onClick={() => { setActiveTab('docs'); setSearchParams(p => { p.set('tab', 'docs'); p.delete('session'); return p }) }} className={tabClass('docs')}>
                    <FileText size={14} />
                    Docs
                    {docGen.doneCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-lime-400 text-black border border-black leading-none">
                        {docGen.doneCount}/{docGen.totalCount || 31}
                      </span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('chat'); setSearchParams(p => { p.set('tab', 'chat'); p.delete('session'); return p }) }} className={tabClass('chat')}>
                    <MessageSquare size={14} />
                    Chat
                    {messages.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-pink-400 text-black border border-black leading-none">
                        {messages.length}
                      </span>
                    )}
                  </button>
                  <button onClick={() => { setActiveTab('spec'); setSearchParams(p => { p.set('tab', 'spec'); return p }) }} className={tabClass('spec')}>
                    <Bot size={14} />
                    Spec Agent
                  </button>
                </div>
              </div>

              {/* ── Tab: Overview ── */}
              {activeTab === 'overview' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Generate progress */}
                  {isGenerating && (
                    <Panel alt className="p-4 space-y-3">
                      <p className={`font-bold text-sm ${theme.text}`}>Generating files...</p>
                      {total > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {Array.from({ length: total }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-4 border-2 ${theme.border} inline-block ${
                                i < done ? 'bg-pink-400' : theme.surface
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {progressFiles.length > 0 && (
                        <div className="space-y-1">
                          {progressFiles.map((file, idx) => (
                            <div key={file} className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 flex items-center justify-center ${
                                  idx < done ? 'text-lime-600' : theme.textMuted
                                }`}
                              >
                                {idx < done ? <Check size={12} /> : <ChevronRight size={12} />}
                              </span>
                              <span className={`text-xs ${theme.text}`}>{file}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {generateProgress && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          {generateProgress.done} / {generateProgress.total} —{' '}
                          {generateProgress.file}
                        </p>
                      )}
                    </Panel>
                  )}

                  {/* Analysis */}
                  {activeProject.analysis && (
                    <Panel alt className="p-4">
                      <p className={`font-bold mb-2 ${theme.text}`}>Analysis Result</p>
                      <MarkdownRenderer content={activeProject.analysis} />
                    </Panel>
                  )}

                  {/* Questions & Answers timeline */}
                  <Panel alt className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <p className={`font-bold ${theme.text}`}>Questions & Answers</p>
                      {isAIProject && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase bg-yellow-300 text-black border border-black/30 leading-none">
                          <Sparkles size={8} />
                          AI-Assisted
                        </span>
                      )}
                    </div>
                    {activeQuestions.length === 0 ? (
                      <p className={`text-xs ${theme.textMuted}`}>No answers recorded.</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-2 top-1 bottom-1 w-[2px] bg-black/30" />
                        <div className="space-y-2">
                          {activeQuestions.map((q, idx) => {
                            const rawAnswer = activeAnswers[q.id]
                            const displayAnswer = answerLabel(q, activeAnswers, q.id)
                            const hasAnswer = rawAnswer !== undefined && rawAnswer !== '' && !(Array.isArray(rawAnswer) && rawAnswer.length === 0)
                            return (
                              <div key={q.id} className="pl-8 pr-2 py-2 relative">
                                <span className={`absolute left-0.5 top-3 w-3 h-3 rounded-full border-2 ${hasAnswer ? 'bg-black border-yellow-300' : 'bg-zinc-300 border-zinc-400'}`} />
                                <p className={`text-[11px] uppercase ${theme.textMuted}`}>
                                  {isAIProject ? `Q${idx + 1}` : `Step ${idx + 1}`}
                                  {q.type === 'multi' && (
                                    <span className="ml-1 text-[9px] font-bold text-sky-500 normal-case">multi-select</span>
                                  )}
                                </p>
                                <p className={`text-xs font-semibold ${theme.text}`}>{q.prompt}</p>
                                <p className={`text-xs mt-0.5 ${hasAnswer ? theme.textMuted : 'text-zinc-400 italic'}`}>
                                  {hasAnswer ? displayAnswer : 'Not answered'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </Panel>

                  {/* Generated files */}
                  {(generatedFiles.length > 0 ||
                    (activeProject.generatedFiles?.length ?? 0) > 0) && (
                    <Panel alt className="p-4 space-y-2">
                      <p className={`font-bold ${theme.text}`}>Generated Files</p>
                      <FileViewer files={generatedFiles} />
                    </Panel>
                  )}
                </div>
              )}

              {/* ── Tab: Docs ── */}
              {activeTab === 'docs' && (() => {
                const viewingSnapshot = selectedSpecVersionId !== null && specVersions.selectedVersion?.id === selectedSpecVersionId && specVersions.selectedVersion?.docsSnapshot
                const snapshotDocs = viewingSnapshot && activeProject
                  ? snapshotToDocCategories(specVersions.selectedVersion!.docsSnapshot!, activeProject.id)
                  : null

                return (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Version selector banner */}
                    {specVersions.versions.length > 0 && (
                      <VersionSelector
                        versions={specVersions.versions}
                        selectedVersionId={selectedSpecVersionId}
                        isLoading={specVersions.isLoading}
                        isRestoring={specVersions.isRestoring}
                        onSelect={async (versionId) => {
                          setSelectedSpecVersionId(versionId)
                          if (versionId) {
                            await specVersions.viewVersion(versionId)
                          } else {
                            specVersions.setSelectedVersion(null)
                          }
                        }}
                        onRestore={async (versionId) => {
                          try {
                            await specVersions.restoreVersion(versionId)
                            toast.success('Version restored as current.')
                          } catch (e) {
                            toast.error((e as Error).message)
                          }
                        }}
                        onExport={(versionId, fmt) => specVersions.exportVersion(versionId, fmt)}
                      />
                    )}

                    {/* Docs viewer */}
                    <div className="flex-1 overflow-hidden">
                      {snapshotDocs ? (
                        <DocCategoryViewer
                          docs={snapshotDocs}
                          doneCount={snapshotDocs.reduce((acc, cat) => acc + cat.docs.filter(d => d.status === 'done').length, 0)}
                          totalCount={snapshotDocs.reduce((acc, cat) => acc + cat.docs.length, 0)}
                          isGenerating={false}
                          generatingDocKey={null}
                          liveContent=""
                          overallProgress={{ done: 0, total: 0 }}
                          readOnly
                          onGenerateAll={() => {}}
                          onGenerateCategory={() => {}}
                          onRegenerateDoc={() => {}}
                          onFetchContent={(key) => Promise.resolve(
                            specVersions.selectedVersion?.docsSnapshot?.[key]?.content ?? null
                          )}
                        />
                      ) : (
                        <DocCategoryViewer
                          docs={docGen.docsByCategory}
                          doneCount={docGen.doneCount}
                          totalCount={docGen.totalCount || 31}
                          isGenerating={docGen.isGenerating}
                          generatingDocKey={docGen.generatingDocKey}
                          liveContent={docGen.liveContent}
                          overallProgress={docGen.overallProgress}
                          onGenerateAll={() => activeProject && docGen.generateAll(activeProject.id)}
                          onGenerateCategory={(cat) => activeProject && docGen.generateCategory(activeProject.id, cat)}
                          onRegenerateDoc={(key) => activeProject && docGen.regenerateDoc(activeProject.id, key)}
                          onFetchContent={(key) => activeProject ? docGen.fetchDocContent(activeProject.id, key) : Promise.resolve(null)}
                        />
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ── Tab: Spec Agent ── */}
              {activeTab === 'spec' && (
                <div className="flex-1 overflow-hidden min-h-0">
                  <SpecTab
                    projectId={activeProject.id}
                    initialSessionId={Number(searchParams.get('session')) || undefined}
                    onSessionSelect={(sessionId) => {
                      setSearchParams(prev => {
                        prev.set('tab', 'spec')
                        if (sessionId) prev.set('session', String(sessionId))
                        else prev.delete('session')
                        return prev
                      })
                    }}
                  />
                </div>
              )}

              {/* ── Tab: Chat ── */}
              {activeTab === 'chat' && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {/* Chat action bar */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-between gap-2 flex-wrap px-4 py-2 border-b-2 ${theme.border} ${theme.panelAlt}`}
                  >
                    <p className={`text-sm font-semibold ${theme.textMuted}`}>
                      {messages.length === 0
                        ? 'No messages yet — ask Ollama anything about this project.'
                        : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateReport}
                        disabled={isStreaming}
                        className={`px-3 py-1.5 text-sm border-2 ${theme.buttonGhost} focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50`}
                      >
                        Generate Report
                      </button>
                      {!confirmClear ? (
                        <button
                          onClick={() => setConfirmClear(true)}
                          disabled={messages.length === 0}
                          className={`px-3 py-1.5 text-sm border-2 ${theme.buttonDanger} focus-visible:ring-2 focus-visible:ring-black disabled:opacity-40`}
                        >
                          Clear History
                        </button>
                      ) : (
                        <div
                          className={`flex items-center gap-2 px-2 py-1 border-2 ${theme.border} ${theme.surface}`}
                        >
                          <span className={`text-sm font-semibold ${theme.text}`}>Clear all?</span>
                          <button
                            onClick={handleClearHistory}
                            disabled={isClearing}
                            className="w-6 h-6 flex items-center justify-center bg-red-400 border border-black focus-visible:ring-2 focus-visible:ring-black"
                            aria-label="Confirm clear"
                          >
                            {isClearing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmClear(false)}
                            className="w-6 h-6 flex items-center justify-center bg-zinc-200 border border-black focus-visible:ring-2 focus-visible:ring-black"
                            aria-label="Cancel clear"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className={`flex-1 min-h-0 overflow-y-auto p-3 space-y-2 ${theme.panelAlt}`}>
                    {messages.length === 0 && !isStreaming ? (
                      <div
                        className={`h-full flex items-center justify-center text-sm ${theme.textMuted}`}
                      >
                        Start chatting with Ollama for this project.
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] p-3 border-2 ${
                            msg.role === 'user'
                              ? 'ml-auto bg-yellow-200 border-black text-black'
                              : `mr-auto ${theme.surface} ${theme.border} ${theme.text}`
                          }`}
                        >
                          <p className="text-[10px] uppercase font-bold mb-1">{msg.role}</p>
                          {msg.role === 'assistant' ? (
                            <MarkdownRenderer content={msg.content} />
                          ) : (
                            <pre className="text-xs whitespace-pre-wrap">{msg.content}</pre>
                          )}
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.role === 'user' ? 'text-zinc-600' : theme.textMuted
                            }`}
                          >
                            {timeAgo(msg.createdAt)}
                          </p>
                        </div>
                      ))
                    )}

                    {isStreaming && liveReply && (
                      <div
                        className={`max-w-[85%] p-3 border-2 mr-auto ${theme.surface} ${theme.border} ${theme.text}`}
                      >
                        <p className="text-[10px] uppercase font-bold mb-1">ASSISTANT</p>
                        <MarkdownRenderer content={liveReply} />
                      </div>
                    )}

                    {isStreaming && !liveReply && (
                      <div
                        className={`max-w-[85%] p-3 border-2 mr-auto ${theme.surface} ${theme.border}`}
                      >
                        <TypingIndicator />
                      </div>
                    )}

                    <div ref={conversationEndRef} />
                  </div>

                  {/* Input bar */}
                  <div
                    className={`flex-shrink-0 border-t-2 ${theme.border} ${theme.surface} p-3 flex gap-2`}
                  >
                    <textarea
                      ref={textareaRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onInput={handleTextareaInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Ask Ollama about this project... (Enter to send, Shift+Enter for newline)"
                      style={{ height: 'auto', minHeight: '2.5rem' }}
                      rows={1}
                      className={`flex-1 border-2 p-2 bg-transparent resize-none ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
                    />
                    <button
                      onClick={handleSend}
                      disabled={isStreaming || !chatInput.trim()}
                      className={`flex-shrink-0 px-3 py-2 border-2 ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
