import { useRef, useEffect, type FormEvent } from 'react'
import { Send, Loader2, AlertCircle, X, CheckSquare } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
import { SpecPhaseBadge } from './SpecPhaseBadge'
import type { SpecMessage, SpecPhase } from '../../types/spec'
import type { PhaseSuggestion } from '../../hooks/useSpecChat'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-1">
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
    </div>
  )
}

type Props = {
  messages: SpecMessage[]
  isStreaming: boolean
  liveReply: string
  currentPhase: SpecPhase
  phaseSuggestion: PhaseSuggestion | null
  checkpointSuggested: boolean
  error: string | null
  input: string
  onInputChange: (v: string) => void
  onSend: () => void
  onDismissPhaseSuggestion: () => void
  onDismissCheckpointSuggestion: () => void
  onRunCheckpoint: () => void
  isCheckpointLoading: boolean
}

export function SpecChat({
  messages, isStreaming, liveReply, currentPhase,
  phaseSuggestion, checkpointSuggested, error,
  input, onInputChange, onSend,
  onDismissPhaseSuggestion, onDismissCheckpointSuggestion,
  onRunCheckpoint, isCheckpointLoading,
}: Props) {
  const { theme } = useTheme()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(frame)
  }, [messages, liveReply, isStreaming])

  function handleTextareaInput(e: FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = send, Shift+Enter = newline, Cmd/Ctrl+Enter = also send
    const isSend = (e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
    if (isSend) {
      e.preventDefault()
      onSend()
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  const phaseLabel = currentPhase.replace('_', ' ')

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Phase banner */}
      <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b-2 ${theme.border} ${theme.panelAlt}`}>
        <SpecPhaseBadge phase={currentPhase} size="sm" />
        <span className={`text-[11px] ${theme.textMuted}`}>
          Phase: <span className="font-bold capitalize">{phaseLabel}</span>
        </span>
      </div>

      {/* Suggestions */}
      {checkpointSuggested && (
        <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b-2 ${theme.border} bg-sky-100 border-sky-600 text-sky-900`}>
          <div className="flex items-center gap-2">
            <CheckSquare size={13} />
            <p className="text-xs font-semibold">Save a checkpoint now to capture what's been gathered so far.</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onRunCheckpoint}
              disabled={isCheckpointLoading}
              className="px-2 py-0.5 text-[11px] font-black border-2 border-sky-600 bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 flex items-center gap-1"
            >
              {isCheckpointLoading ? <Loader2 size={10} className="animate-spin" /> : null}
              Save
            </button>
            <button onClick={onDismissCheckpointSuggestion} className="p-0.5 hover:opacity-70">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {phaseSuggestion && (
        <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b-2 ${theme.border} bg-violet-100 border-violet-600 text-violet-900`}>
          <p className="text-xs font-semibold">{phaseSuggestion.reason}</p>
          <button onClick={onDismissPhaseSuggestion} className="p-0.5 hover:opacity-70 flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 min-h-0 overflow-y-auto p-3 space-y-2 ${theme.panelAlt}`}>
        {messages.length === 0 && !isStreaming && !error ? (
          <div className={`h-full flex flex-col items-center justify-center gap-2 text-center px-6`}>
            <p className={`text-sm font-black ${theme.text}`}>Start the conversation</p>
            <p className={`text-xs ${theme.textMuted}`}>
              Describe your project idea, business problem, or goals. The Spec Agent will guide you through structured elicitation across four phases.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[88%] p-3 border-2 ${
                msg.role === 'user'
                  ? 'ml-auto bg-yellow-200 border-black text-black'
                  : msg.messageType === 'checkpoint'
                    ? `mr-auto bg-sky-100 border-sky-500 text-sky-900`
                    : msg.messageType === 'phase_transition'
                      ? `mr-auto bg-violet-100 border-violet-500 text-violet-900`
                      : `mr-auto ${theme.surface} ${theme.border} ${theme.text}`
              }`}
            >
              <p className="text-[10px] uppercase font-black mb-1">
                {msg.role === 'user' ? 'You' :
                 msg.messageType === 'checkpoint' ? 'Checkpoint' :
                 msg.messageType === 'phase_transition' ? 'Phase Transition' :
                 'Spec Agent'}
              </p>
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-sans">{msg.content}</pre>
              )}
            </div>
          ))
        )}

        {isStreaming && liveReply && (
          <div className={`max-w-[88%] p-3 border-2 mr-auto ${theme.surface} ${theme.border} ${theme.text}`}>
            <p className="text-[10px] uppercase font-black mb-1">Spec Agent</p>
            <MarkdownRenderer content={liveReply} />
          </div>
        )}

        {isStreaming && !liveReply && (
          <div className={`max-w-[88%] p-3 border-2 mr-auto ${theme.surface} ${theme.border}`}>
            <TypingIndicator />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 border-2 border-red-500 bg-red-50 text-red-800 text-xs">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`flex-shrink-0 border-t-2 ${theme.border} ${theme.surface} p-2 flex gap-2`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Describe your project or answer questions… (Enter to send, Shift+Enter for newline)"
          style={{ height: 'auto', minHeight: '2.5rem' }}
          rows={1}
          disabled={isStreaming}
          className={`flex-1 border-2 p-2 bg-transparent resize-none ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black text-sm disabled:opacity-60`}
        />
        <button
          onClick={() => { onSend(); setTimeout(() => textareaRef.current?.focus(), 50) }}
          disabled={isStreaming || !input.trim()}
          className={`flex-shrink-0 px-3 py-2 border-2 ${theme.buttonPrimary} focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 flex items-center gap-1.5`}
        >
          {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span className="text-sm font-black">Send</span>
        </button>
      </div>
    </div>
  )
}
