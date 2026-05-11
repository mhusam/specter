import { Download, RotateCcw, X, GitBranch, Loader2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { SpecVersion } from '../../types/spec'

type Props = {
  versions: SpecVersion[]
  selectedVersionId: number | null
  isLoading: boolean
  isRestoring: boolean
  onSelect: (versionId: number | null) => void
  onRestore: (versionId: number) => void
  onExport: (versionId: number, format: 'zip' | 'markdown') => void
}

export function VersionSelector({
  versions, selectedVersionId, isLoading, isRestoring,
  onSelect, onRestore, onExport,
}: Props) {
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
        <Loader2 size={13} className="animate-spin text-zinc-400" />
        <span className={`text-xs ${theme.textMuted}`}>Loading spec versions…</span>
      </div>
    )
  }

  if (versions.length === 0) return null

  const selectedVersion = selectedVersionId
    ? versions.find(v => v.id === selectedVersionId) ?? null
    : null
  const currentVersion = versions.find(v => v.isCurrent) ?? null
  const isViewingHistorical = selectedVersion && !selectedVersion.isCurrent

  return (
    <div className={`flex-shrink-0 border-b-2 ${theme.border} ${theme.surface}`}>
      {/* Version picker row */}
      <div className="flex items-center gap-3 px-4 py-2">
        <GitBranch size={13} className={theme.textMuted} />
        <span className={`text-xs font-black uppercase ${theme.textMuted}`}>Spec Version:</span>

        <select
          value={selectedVersionId ?? ''}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
          className={`text-xs border-2 ${theme.border} ${theme.surface} ${theme.text} px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
        >
          <option value="">— Live docs (31 standard) —</option>
          {versions.map(v => (
            <option key={v.id} value={v.id}>
              {v.versionLabel}{v.isCurrent ? ' (current)' : ''} — {v.changeType}
              {v.changeSummary ? ` · ${v.changeSummary.slice(0, 40)}` : ''}
            </option>
          ))}
        </select>

        {currentVersion && !selectedVersionId && (
          <span className={`text-[10px] px-1.5 py-0.5 border border-lime-500 text-lime-600 font-bold`}>
            Latest: {currentVersion.versionLabel}
          </span>
        )}
      </div>

      {/* Historical banner */}
      {isViewingHistorical && selectedVersion && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2 border-t-2 ${theme.border} bg-sky-100 border-sky-400`}>
          <div className="flex items-center gap-2 text-sky-900">
            <span className="text-xs font-black">Viewing spec {selectedVersion.versionLabel}</span>
            <span className="text-[10px]">
              · {selectedVersion.docCountSuccess} docs
              · {new Date(selectedVersion.createdAt).toLocaleDateString()}
              {selectedVersion.sessionContextSnapshot && (
                <> · from: {selectedVersion.sessionContextSnapshot.sessionName}</>
              )}
            </span>
            <span className="text-[10px] opacity-70">(read-only)</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onRestore(selectedVersion.id)}
              disabled={isRestoring}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-black border-2 border-sky-600 bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {isRestoring ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
              Restore as Current
            </button>
            <button
              onClick={() => onExport(selectedVersion.id, 'markdown')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-black border-2 border-sky-600 text-sky-700 hover:bg-sky-50"
            >
              <Download size={10} />
              Export .md
            </button>
            <button
              onClick={() => onExport(selectedVersion.id, 'zip')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-black border-2 border-sky-600 text-sky-700 hover:bg-sky-50"
            >
              <Download size={10} />
              .zip
            </button>
            <button
              onClick={() => onSelect(null)}
              className="p-1 hover:opacity-70 text-sky-700"
              title="Back to live docs"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Current version banner */}
      {selectedVersion && selectedVersion.isCurrent && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2 border-t-2 ${theme.border} bg-lime-50 border-lime-400`}>
          <span className="text-[11px] text-lime-800 font-semibold">
            Viewing current spec {selectedVersion.versionLabel} — {selectedVersion.docCountSuccess} docs generated
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport(selectedVersion.id, 'markdown')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-black border-2 border-lime-600 text-lime-700 hover:bg-lime-100"
            >
              <Download size={10} />
              Export .md
            </button>
            <button
              onClick={() => onExport(selectedVersion.id, 'zip')}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-black border-2 border-lime-600 text-lime-700 hover:bg-lime-100"
            >
              <Download size={10} />
              .zip
            </button>
            <button
              onClick={() => onSelect(null)}
              className="p-1 hover:opacity-70 text-lime-700"
              title="Back to live docs"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
