import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Zap, GitBranch, BookmarkCheck, Loader2, Edit2, Check, X,
  MessageSquare,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { useSpecSessions } from '../../hooks/useSpecSessions'
import { useSpecChat } from '../../hooks/useSpecChat'
import { useSpecGeneration } from '../../hooks/useSpecGeneration'
import { useSpecVersions } from '../../hooks/useSpecVersions'
import { SpecSessionList } from './SpecSessionList'
import { SpecChat } from './SpecChat'
import { SpecPhaseBadge } from './SpecPhaseBadge'
import { SpecGenerateModal } from './SpecGenerateModal'
import { SpecGenerationProgress } from './SpecGenerationProgress'
import { SpecVersionPanel } from './SpecVersionPanel'
import { SpecSidebar } from './SpecSidebar'
import { SpecVersionDiffModal } from './SpecVersionDiffModal'
import type { SpecSession } from '../../types/spec'
import type { SpecChangeType } from '../../types/spec'

type WorkspaceTab = 'chat' | 'generate' | 'versions'

type Props = {
  projectId: number
  initialSessionId?: number
  onSessionSelect?: (sessionId: number | null) => void
}

export function SpecTab({ projectId, initialSessionId, onSessionSelect }: Props) {
  const { theme } = useTheme()
  const toast = useToast()

  const sessions = useSpecSessions(projectId)
  const chat = useSpecChat(projectId)
  const generation = useSpecGeneration(projectId)
  const versions = useSpecVersions(projectId)

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active')
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('chat')
  const [chatInput, setChatInput] = useState('')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<SpecSession | null>(null)
  const [showDiffModal, setShowDiffModal] = useState(false)
  const autoCheckpointRef = useRef(false)
  const initialSessionApplied = useRef(false)

  // Load sessions on mount and when filter changes
  useEffect(() => {
    sessions.loadSessions(statusFilter)
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select session from URL on first load
  useEffect(() => {
    if (initialSessionApplied.current || !initialSessionId || sessions.sessions.length === 0) return
    const target = sessions.sessions.find(s => s.id === initialSessionId)
    if (target) {
      initialSessionApplied.current = true
      sessions.selectSession(target.id)
    }
  }, [sessions.sessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // When active session changes, load its messages and versions
  useEffect(() => {
    if (!sessions.activeSession) return
    const s = sessions.activeSession
    const msgs = s.messages ?? []
    chat.loadMessages(msgs, s.phase)
    setChatInput('')
    versions.loadVersions()
    onSessionSelect?.(s.id)
  }, [sessions.activeSession?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-checkpoint: when backend suggests it, trigger silently in background
  useEffect(() => {
    if (!chat.checkpointSuggested || !sessions.activeSession || autoCheckpointRef.current) return
    if (sessions.activeSession.status === 'archived') return
    autoCheckpointRef.current = true
    chat.dismissCheckpointSuggestion()
    sessions.runCheckpoint(sessions.activeSession.id)
      .then(() => toast.success('Auto-checkpoint saved.'))
      .catch(() => { /* silent — don't disrupt chat */ })
      .finally(() => { autoCheckpointRef.current = false })
  }, [chat.checkpointSuggested]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Esc closes modals
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showDiffModal) { setShowDiffModal(false); return }
      if (showGenerateModal) { setShowGenerateModal(false); return }
      if (confirmDeleteSession) { setConfirmDeleteSession(null); return }
      if (isRenaming) { setIsRenaming(false); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDiffModal, showGenerateModal, confirmDeleteSession, isRenaming])

  const handleSelectSession = useCallback(async (session: SpecSession) => {
    await sessions.selectSession(session.id)
  }, [sessions])

  const handleCreateSession = useCallback(async () => {
    try {
      await sessions.createSession()
      setWorkspaceTab('chat')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, toast])

  const handleStartRename = useCallback((session: SpecSession) => {
    setRenameValue(session.name)
    setIsRenaming(true)
  }, [])

  const handleRename = useCallback(async () => {
    if (!sessions.activeSession || !renameValue.trim()) return
    try {
      await sessions.renameSession(sessions.activeSession.id, renameValue.trim())
      setIsRenaming(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, renameValue, toast])

  const handleArchive = useCallback(async (session: SpecSession) => {
    try {
      await sessions.archiveSession(session.id)
      toast.success(`Session "${session.name}" archived.`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, toast])

  const handleRestore = useCallback(async (session: SpecSession) => {
    try {
      await sessions.restoreSession(session.id)
      toast.success(`Session restored.`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, toast])

  const handleDuplicate = useCallback(async (session: SpecSession) => {
    try {
      await sessions.duplicateSession(session.id)
      setWorkspaceTab('chat')
      toast.success(`"${session.name}" duplicated.`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, toast])

  const handleDelete = useCallback(async (session: SpecSession) => {
    setConfirmDeleteSession(session)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteSession) return
    try {
      await sessions.deleteSession(confirmDeleteSession.id)
      setConfirmDeleteSession(null)
      toast.success('Session deleted.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, confirmDeleteSession, toast])

  const handleSend = useCallback(async () => {
    if (!sessions.activeSession || !chatInput.trim()) return
    await chat.sendMessage(sessions.activeSession.id, chatInput)
    setChatInput('')
  }, [sessions.activeSession, chat, chatInput])

  const handleRunCheckpoint = useCallback(async () => {
    if (!sessions.activeSession) return
    try {
      await sessions.runCheckpoint(sessions.activeSession.id)
      chat.dismissCheckpointSuggestion()
      toast.success('Checkpoint saved — requirements captured.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [sessions, chat, toast])

  const handleGenerate = useCallback(async (changeType: SpecChangeType, changeSummary: string) => {
    if (!sessions.activeSession) return
    setShowGenerateModal(false)
    setWorkspaceTab('generate')
    generation.reset()
    await generation.generate(
      sessions.activeSession.id,
      changeType,
      changeSummary,
      async () => {
        await versions.loadVersions()
        await sessions.refreshActiveSession()
        toast.success('Spec package generated!')
      },
    )
  }, [sessions, generation, versions, toast])

  const handleVersionView = useCallback(async (versionId: number) => {
    await versions.viewVersion(versionId)
  }, [versions])

  const handleVersionRestore = useCallback(async (versionId: number) => {
    try {
      await versions.restoreVersion(versionId)
      toast.success('Version set as current.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [versions, toast])

  // Tab style helper
  function wsTabClass(tab: WorkspaceTab) {
    const active = workspaceTab === tab
    return [
      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-black border-2 transition-colors focus-visible:ring-2 focus-visible:ring-black uppercase',
      active
        ? `${theme.border} bg-pink-400 text-black border-b-0 -mb-[2px] relative z-10`
        : `${theme.border} ${theme.surface} ${theme.textMuted} border-b-0 opacity-60 hover:opacity-90`,
    ].join(' ')
  }

  const activeSession = sessions.activeSession

  return (
    <div className="h-full overflow-hidden grid grid-cols-[220px_1fr]">
      {/* Left: session list */}
      <SpecSessionList
        sessions={sessions.sessions}
        activeSession={activeSession}
        isLoading={sessions.isLoading}
        isCreating={sessions.isCreating}
        statusFilter={statusFilter}
        onFilterChange={(f) => { setStatusFilter(f); sessions.loadSessions(f) }}
        onSelect={handleSelectSession}
        onCreate={handleCreateSession}
        onRename={handleStartRename}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />

      {/* Right: workspace */}
      <div className="flex flex-col h-full overflow-hidden">
        {!activeSession ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${theme.panelAlt}`}>
            <p className={`text-sm font-black ${theme.text}`}>No Session Selected</p>
            <p className={`text-xs text-center max-w-xs ${theme.textMuted}`}>
              Create a new session or select one from the list to start the requirements elicitation conversation.
            </p>
            <button
              onClick={handleCreateSession}
              disabled={sessions.isCreating}
              className={`px-4 py-2 text-sm border-2 ${theme.buttonPrimary} flex items-center gap-2`}
            >
              {sessions.isCreating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              New Session
            </button>
          </div>
        ) : (
          <>
            {/* Session header */}
            <div className={`flex-shrink-0 px-4 pt-3 pb-0 ${theme.surface} border-b-0`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename()
                          if (e.key === 'Escape') setIsRenaming(false)
                        }}
                        className={`flex-1 border-2 ${theme.border} ${theme.surface} ${theme.text} px-2 py-1 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
                      />
                      <button onClick={handleRename} className="w-7 h-7 flex items-center justify-center border-2 border-black bg-lime-400 hover:opacity-80">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setIsRenaming(false)} className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} ${theme.surface} hover:opacity-80`}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className={`font-black text-base ${theme.text} truncate`}>{activeSession.name}</h2>
                      <button
                        onClick={() => handleStartRename(activeSession)}
                        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center border ${theme.border} ${theme.surface} hover:opacity-80`}
                      >
                        <Edit2 size={10} />
                      </button>
                      <SpecPhaseBadge phase={activeSession.phase} />
                    </div>
                  )}
                  <p className={`text-[11px] mt-0.5 ${theme.textMuted}`}>
                    {activeSession.messageCount} messages · {activeSession.checkpointCount} checkpoints
                    {activeSession.status === 'archived' && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] border border-zinc-400 text-zinc-500 font-bold">ARCHIVED</span>
                    )}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleRunCheckpoint}
                    disabled={sessions.checkpointLoading || activeSession.status === 'archived'}
                    title="Save checkpoint"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-2 ${theme.buttonGhost} disabled:opacity-40`}
                  >
                    {sessions.checkpointLoading ? <Loader2 size={12} className="animate-spin" /> : <BookmarkCheck size={12} />}
                    Checkpoint
                  </button>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    disabled={generation.isGenerating || activeSession.status === 'archived'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-2 ${theme.buttonPrimary} disabled:opacity-40`}
                  >
                    {generation.isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Generate Spec
                  </button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className={`flex border-b-2 ${theme.border}`}>
                <button onClick={() => setWorkspaceTab('chat')} className={wsTabClass('chat')}>
                  <MessageSquare size={11} />
                  Chat
                  {chat.messages.length > 0 && (
                    <span className="ml-0.5 px-1 py-0.5 text-[9px] font-black bg-pink-400 text-black border border-black leading-none">
                      {chat.messages.length}
                    </span>
                  )}
                </button>
                <button onClick={() => setWorkspaceTab('generate')} className={wsTabClass('generate')}>
                  <Zap size={11} />
                  Generation
                  {generation.isGenerating && <Loader2 size={10} className="animate-spin ml-1" />}
                </button>
                <button
                  onClick={() => { setWorkspaceTab('versions'); versions.loadVersions() }}
                  className={wsTabClass('versions')}
                >
                  <GitBranch size={11} />
                  Versions
                  {versions.versions.length > 0 && (
                    <span className="ml-0.5 px-1 py-0.5 text-[9px] font-black bg-lime-400 text-black border border-black leading-none">
                      {versions.versions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Workspace content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {workspaceTab === 'chat' && (
                <div className="flex h-full overflow-hidden">
                  {/* Chat — 65% */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <SpecChat
                      messages={chat.messages}
                      isStreaming={chat.isStreaming}
                      liveReply={chat.liveReply}
                      currentPhase={chat.currentPhase}
                      phaseSuggestion={chat.phaseSuggestion}
                      checkpointSuggested={chat.checkpointSuggested}
                      error={chat.error}
                      input={chatInput}
                      onInputChange={setChatInput}
                      onSend={handleSend}
                      onDismissPhaseSuggestion={chat.dismissPhaseSuggestion}
                      onDismissCheckpointSuggestion={chat.dismissCheckpointSuggestion}
                      onRunCheckpoint={handleRunCheckpoint}
                      isCheckpointLoading={sessions.checkpointLoading}
                    />
                  </div>
                  {/* Sidebar — 35% */}
                  <div className="w-[280px] flex-shrink-0 overflow-hidden">
                    <SpecSidebar
                      session={activeSession}
                      messages={chat.messages}
                      checkpointLoading={sessions.checkpointLoading}
                      onRunCheckpoint={handleRunCheckpoint}
                    />
                  </div>
                </div>
              )}

              {workspaceTab === 'generate' && (
                <SpecGenerationProgress
                  docStatuses={generation.docStatuses}
                  doneCount={generation.doneCount}
                  errorCount={generation.errorCount}
                  totalCount={generation.totalCount}
                  result={generation.result}
                  error={generation.error}
                  isRetrying={generation.isGenerating}
                  onClose={() => setWorkspaceTab('versions')}
                  onRetryFailed={generation.result?.versionId ? () => {
                    generation.retryFailed(generation.result!.versionId, async () => {
                      await versions.loadVersions()
                      toast.success('Failed docs retried.')
                    })
                  } : undefined}
                />
              )}

              {workspaceTab === 'versions' && (
                <div className="h-full overflow-hidden">
                  <SpecVersionPanel
                    versions={versions.versions}
                    selectedVersion={versions.selectedVersion}
                    isLoading={versions.isLoading}
                    isRestoring={versions.isRestoring}
                    onView={handleVersionView}
                    onRestore={handleVersionRestore}
                    onExport={(id, fmt) => versions.exportVersion(id, fmt as 'zip' | 'markdown')}
                    onCompare={versions.versions.length >= 2 ? () => setShowDiffModal(true) : undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Version diff modal */}
      {showDiffModal && versions.versions.length >= 2 && (
        <SpecVersionDiffModal
          versions={versions.versions}
          onClose={() => setShowDiffModal(false)}
          onExport={(id, fmt) => versions.exportVersion(id, fmt as 'zip' | 'markdown')}
        />
      )}

      {/* Generate modal */}
      {showGenerateModal && (
        <SpecGenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
          isGenerating={generation.isGenerating}
          hasExistingVersion={versions.versions.length > 0}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`border-4 ${theme.border} ${theme.surface} p-6 max-w-sm w-full`}>
            <p className={`font-black text-sm mb-2 ${theme.text}`}>Delete Session?</p>
            <p className={`text-xs ${theme.textMuted} mb-4`}>
              "{confirmDeleteSession.name}" and all its messages will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDeleteSession(null)}
                className={`px-3 py-1.5 text-sm border-2 ${theme.buttonGhost}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`px-3 py-1.5 text-sm border-2 ${theme.buttonDanger}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
