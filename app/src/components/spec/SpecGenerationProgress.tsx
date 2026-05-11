import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { DocGenerationStatus } from '../../types/spec'
import type { GenerationResult } from '../../hooks/useSpecGeneration'

type Props = {
  docStatuses: DocGenerationStatus[]
  doneCount: number
  errorCount: number
  totalCount: number
  result: GenerationResult | null
  error: string | null
  isRetrying?: boolean
  onClose?: () => void
  onRetryFailed?: () => void
}

export function SpecGenerationProgress({ docStatuses, doneCount, errorCount, totalCount, result, error, isRetrying, onClose, onRetryFailed }: Props) {
  const { theme } = useTheme()

  return (
    <div className={`h-full flex flex-col p-4 gap-4 overflow-y-auto ${theme.panelAlt}`}>
      {/* Summary bar */}
      <div className={`flex-shrink-0 border-2 ${theme.border} ${theme.surface} p-3`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`font-black text-sm ${theme.text}`}>Generating 22 Specification Documents</p>
          {totalCount > 0 && (
            <span className={`text-xs font-bold ${theme.textMuted}`}>
              {doneCount + errorCount}/{totalCount}
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="flex gap-0.5 flex-wrap">
            {docStatuses.map((d) => (
              <div
                key={d.docKey}
                title={d.title}
                className={`w-4 h-4 border border-black ${
                  d.status === 'done'      ? 'bg-lime-400' :
                  d.status === 'error'     ? 'bg-red-400' :
                  d.status === 'generating'? 'bg-sky-400 animate-pulse' :
                                             theme.surface
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div className="flex-shrink-0 border-2 border-black bg-lime-400 p-3 text-black">
          <p className="font-black text-sm">Generation Complete — {result.versionLabel}</p>
          <p className="text-xs mt-0.5">
            {result.successCount} docs generated
            {result.errorCount > 0 && `, ${result.errorCount} errors`}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 text-xs border-2 border-black bg-white font-black hover:bg-zinc-100"
              >
                View Versions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error banner */}
      {/* Retry failed banner */}
      {!result && errorCount > 0 && onRetryFailed && (
        <div className="flex-shrink-0 border-2 border-black bg-orange-100 p-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-orange-900">{errorCount} doc{errorCount !== 1 ? 's' : ''} failed.</p>
          <button
            onClick={onRetryFailed}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1 text-xs border-2 border-black bg-orange-400 font-black hover:bg-orange-500 disabled:opacity-50"
          >
            {isRetrying ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Retry Failed
          </button>
        </div>
      )}

      {error && (
        <div className="flex-shrink-0 border-2 border-black bg-red-400 p-3 text-black flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* Doc list */}
      <div className={`flex-1 border-2 ${theme.border} ${theme.surface} divide-y-2 ${theme.border} overflow-y-auto`}>
        {docStatuses.length === 0 && (
          <div className={`flex items-center justify-center h-24 text-sm ${theme.textMuted}`}>
            Waiting for generation to start…
          </div>
        )}
        {docStatuses.map((d) => (
          <div key={d.docKey} className={`flex items-center gap-3 px-3 py-2 ${theme.text}`}>
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {d.status === 'done'       ? <Check size={13} className="text-lime-600" /> :
               d.status === 'error'      ? <AlertCircle size={13} className="text-red-500" /> :
               d.status === 'generating' ? <Loader2 size={13} className="animate-spin text-sky-500" /> :
               <span className={`w-2 h-2 rounded-full ${theme.textMuted} bg-current`} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{d.title}</p>
              {d.status === 'done' && d.wordCount !== undefined && (
                <p className={`text-[10px] ${theme.textMuted}`}>{d.wordCount.toLocaleString()} words</p>
              )}
              {d.status === 'error' && d.error && (
                <p className="text-[10px] text-red-500 truncate">{d.error}</p>
              )}
            </div>
            <span className={`flex-shrink-0 text-[10px] font-bold uppercase ${
              d.status === 'done'       ? 'text-lime-600' :
              d.status === 'error'      ? 'text-red-500' :
              d.status === 'generating' ? 'text-sky-500' :
              theme.textMuted
            }`}>
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
