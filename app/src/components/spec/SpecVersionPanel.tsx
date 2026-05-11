import { Download, RotateCcw, Eye, Loader2, GitCompare } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { SpecVersion } from '../../types/spec'

type Props = {
  versions: SpecVersion[]
  selectedVersion: SpecVersion | null
  isLoading: boolean
  isRestoring: boolean
  onView: (versionId: number) => void
  onRestore: (versionId: number) => void
  onExport: (versionId: number, format: 'zip' | 'markdown') => void
  onCompare?: () => void
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  initial: 'bg-pink-400',
  major:   'bg-red-400',
  minor:   'bg-sky-400',
  patch:   'bg-lime-400',
}

export function SpecVersionPanel({ versions, selectedVersion, isLoading, isRestoring, onView, onRestore, onExport, onCompare }: Props) {
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.textMuted}`}>
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 px-4 text-center`}>
        <p className={`text-sm font-black ${theme.text}`}>No versions yet</p>
        <p className={`text-xs ${theme.textMuted}`}>Generate the spec package from a session to create the first version snapshot.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      {versions.length >= 2 && onCompare && (
        <div className={`flex-shrink-0 flex items-center justify-end px-3 py-2 border-b-2 ${theme.border} ${theme.panelAlt}`}>
          <button
            onClick={onCompare}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black border-2 ${theme.border} ${theme.buttonGhost}`}
          >
            <GitCompare size={11} /> Compare Versions
          </button>
        </div>
      )}

      {/* Version list */}
      <div className={`flex-1 overflow-y-auto divide-y-2 ${theme.border}`}>
        {versions.map((v) => (
          <div
            key={v.id}
            className={`p-3 flex items-start gap-3 ${
              selectedVersion?.id === v.id ? 'bg-yellow-200 text-black' : `${theme.surface} ${theme.text}`
            }`}
          >
            {/* Version label */}
            <div className="flex-shrink-0 flex flex-col items-start gap-1">
              <span className={`px-2 py-0.5 text-xs font-black border-2 border-black ${
                v.isCurrent ? 'bg-lime-400 text-black' : `${theme.surface} ${theme.textMuted}`
              }`}>
                {v.versionLabel}
              </span>
              <span className={`px-1.5 py-0.5 text-[10px] font-black border border-black uppercase ${CHANGE_TYPE_COLORS[v.changeType] || 'bg-zinc-300'} text-black`}>
                {v.changeType}
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {v.changeSummary && (
                <p className="text-xs font-semibold truncate">{v.changeSummary}</p>
              )}
              <p className={`text-[10px] mt-0.5 ${selectedVersion?.id === v.id ? 'text-zinc-600' : theme.textMuted}`}>
                {v.docCountSuccess} docs · {new Date(v.createdAt).toLocaleDateString()}
              </p>
              {v.sessionContextSnapshot && (
                <p className={`text-[10px] truncate ${selectedVersion?.id === v.id ? 'text-zinc-600' : theme.textMuted}`}>
                  from: {v.sessionContextSnapshot.sessionName}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                onClick={() => onView(v.id)}
                title="View docs"
                className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} ${theme.surface} hover:opacity-80`}
              >
                <Eye size={11} />
              </button>
              <button
                onClick={() => onExport(v.id, 'markdown')}
                title="Export markdown"
                className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} ${theme.surface} hover:opacity-80`}
              >
                <Download size={11} />
              </button>
              {!v.isCurrent && (
                <button
                  onClick={() => onRestore(v.id)}
                  disabled={isRestoring}
                  title="Set as current"
                  className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} bg-lime-400 border-black hover:opacity-80 disabled:opacity-40`}
                >
                  {isRestoring ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded view of selected version docs */}
      {selectedVersion?.docsSnapshot && (
        <div className={`border-t-4 ${theme.border} flex-shrink-0 max-h-60 overflow-y-auto`}>
          <div className={`px-3 py-2 border-b-2 ${theme.border} ${theme.panelAlt}`}>
            <p className={`text-xs font-black ${theme.text}`}>
              {selectedVersion.versionLabel} — Document Snapshot
            </p>
          </div>
          <div className={`divide-y ${theme.border}`}>
            {Object.entries(selectedVersion.docsSnapshot).map(([key, doc]) => (
              <div key={key} className={`px-3 py-1.5 flex items-center gap-2 ${theme.surface}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${doc.status === 'done' ? 'bg-lime-500' : 'bg-red-400'}`} />
                <span className={`text-[11px] flex-1 truncate ${theme.text}`}>{doc.title || key}</span>
                {doc.wordCount > 0 && (
                  <span className={`text-[10px] ${theme.textMuted}`}>{doc.wordCount.toLocaleString()}w</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
