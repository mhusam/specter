import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import { MessageSquare, Inbox, X, Check, Loader2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { useConversations } from '../../hooks/useConversations'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
import { EmptyState } from '../ui/EmptyState'
import { timeAgo } from '../../utils'
import type { Project } from '../../types'

type ConversationsPageProps = {
  projects: Project[]
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

export default function ConversationsPage({ projects }: ConversationsPageProps) {
  const { theme } = useTheme()
  const toast = useToast()
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

  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(frame)
  }, [messages, liveReply, isStreaming])

  async function selectProject(project: Project) {
    setActiveProject(project)
    setConfirmClear(false)
    try {
      await loadConversation(project.id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleSend = useCallback(async () => {
    if (!activeProject || !chatInput.trim() || isStreaming) return
    try {
      await sendChatMessage(activeProject.id, chatInput)
    } catch (e) {
      toast.error((e as Error).message)
    }
    // Restore focus after send
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

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full grid grid-cols-[280px_1fr] overflow-hidden">
        {/* Project list */}
        <div className={`border-r-4 ${theme.border} ${theme.surface} overflow-y-auto`}>
          {projects.length === 0 ? (
            <EmptyState
              icon={<Inbox size={22} />}
              message="Add a project first to start chatting."
            />
          ) : (
            projects.map((project) => {
              const isActive = activeProject?.id === project.id
              return (
                <button
                  key={project.id}
                  onClick={() => selectProject(project)}
                  className={`w-full text-left px-4 py-3 border-b-2 ${theme.border} transition-colors ${
                    isActive ? 'bg-yellow-200 text-black' : `${theme.surface} ${theme.text} hover:opacity-80`
                  }`}
                >
                  <p className="font-semibold">{project.name}</p>
                  <p className={`text-xs ${isActive ? 'text-zinc-600' : theme.textMuted}`}>{project.depth}</p>
                </button>
              )
            })
          )}
        </div>

        {/* Chat panel */}
        <div className={`flex flex-col min-h-0 overflow-hidden ${theme.surface}`}>
          {!activeProject ? (
            <EmptyState
              icon={<MessageSquare size={22} />}
              message="Select a project to view conversations."
            />
          ) : (
            <>
              {/* Header */}
              <div className={`p-3 border-b-2 ${theme.border} ${theme.panelAlt} flex items-center justify-between flex-wrap gap-2`}>
                <p className={`font-bold ${theme.text}`}>Project: {activeProject.name}</p>
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
                      className={`px-3 py-1.5 text-sm border-2 ${theme.buttonDanger} focus-visible:ring-2 focus-visible:ring-black`}
                    >
                      Clear History
                    </button>
                  ) : (
                    <div className={`flex items-center gap-2 px-2 py-1 border-2 ${theme.border} ${theme.surface}`}>
                      <span className={`text-sm font-semibold ${theme.text}`}>Clear all?</span>
                      <button
                        onClick={handleClearHistory}
                        disabled={isClearing}
                        className="w-6 h-6 flex items-center justify-center bg-red-400 border border-black focus-visible:ring-2 focus-visible:ring-black"
                        aria-label="Confirm clear"
                      >
                        {isClearing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
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
                  <div className={`h-full flex items-center justify-center text-sm ${theme.textMuted}`}>
                    Start chatting with Ollama for this project.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] p-3 border-2 ${
                        msg.role === 'user'
                          ? `ml-auto bg-yellow-200 border-black text-black`
                          : `mr-auto ${theme.surface} ${theme.border} ${theme.text}`
                      }`}
                    >
                      <p className="text-[10px] uppercase font-bold mb-1">{msg.role}</p>
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap">{msg.content}</pre>
                      )}
                      <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-zinc-600' : theme.textMuted}`}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  ))
                )}

                {/* Streaming: content present */}
                {isStreaming && liveReply && (
                  <div className={`max-w-[85%] p-3 border-2 mr-auto ${theme.surface} ${theme.border} ${theme.text}`}>
                    <p className="text-[10px] uppercase font-bold mb-1">ASSISTANT</p>
                    <MarkdownRenderer content={liveReply} />
                  </div>
                )}

                {/* Streaming: no content yet — typing indicator */}
                {isStreaming && !liveReply && (
                  <div className={`max-w-[85%] p-3 border-2 mr-auto ${theme.surface} ${theme.border}`}>
                    <TypingIndicator />
                  </div>
                )}

                <div ref={conversationEndRef} />
              </div>

              {/* Input bar */}
              <div className={`border-t-2 ${theme.border} ${theme.surface} p-3 flex gap-2`}>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
