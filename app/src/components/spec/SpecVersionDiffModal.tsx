import { useState } from 'react'
import { X, GitCompare, Download } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { SpecVersion, SpecDocSnapshot } from '../../types/spec'

type DiffRow = {
  docKey: string
  title: string
  statusA: 'done' | 'error' | 'missing'
  statusB: 'done' | 'error' | 'missing'
  wordsA: number
  wordsB: number
  changed: boolean
}

function buildDiff(a: SpecVersion, b: SpecVersion): DiffRow[] {
  const snapshotA = a.docsSnapshot ?? {}
  const snapshotB = b.docsSnapshot ?? {}
  const allKeys = Array.from(new Set([...Object.keys(snapshotA), ...Object.keys(snapshotB)])).sort()

  return allKeys.map((key) => {
    const docA = snapshotA[key] as SpecDocSnapshot | undefined
    const docB = snapshotB[key] as SpecDocSnapshot | undefined
    const statusA = docA ? (docA.status === 'done' ? 'done' : 'error') : 'missing'
    const statusB = docB ? (docB.status === 'done' ? 'done' : 'error') : 'missing'
    const wordsA = docA?.wordCount ?? 0
    const wordsB = docB?.wordCount ?? 0
    const changed = statusA !== statusB || Math.abs(wordsA - wordsB) > 50

    return {
      docKey: key,
      title: docB?.title ?? docA?.title ?? key,
      statusA, statusB,
      wordsA, wordsB,
      changed,
    }
  })
}

function StatusBadge({ status }: { status: 'done' | 'error' | 'missing' }) {
  const cfg = {
    done:    { cls: 'bg-lime-400 text-black',   label: 'done' },
    error:   { cls: 'bg-red-400 text-black',    label: 'error' },
    missing: { cls: 'bg-zinc-200 text-zinc-600', label: '—' },
  }[status]
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-black border border-black ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

type Props = {
  versions: SpecVersion[]
  onClose: () => void
  onExport: (versionId: number, format: 'zip' | 'markdown') => void
}

export function SpecVersionDiffModal({ versions, onClose, onExport }: Props) {
  const { theme } = useTheme()
  const [versionAId, setVersionAId] = useState<number>(versions[versions.length - 1]?.id ?? 0)
  const [versionBId, setVersionBId] = useState<number>(versions[0]?.id ?? 0)
  const [showChangedOnly, setShowChangedOnly] = useState(false)

  const versionA = versions.find(v => v.id === versionAId) ?? null
  const versionB = versions.find(v => v.id === versionBId) ?? null

  const hasBothSnapshots = versionA?.docsSnapshot && versionB?.docsSnapshot
  const diff = hasBothSnapshots && versionA && versionB ? buildDiff(versionA, versionB) : []
  const displayDiff = showChangedOnly ? diff.filter(r => r.changed) : diff
  const changedCount = diff.filter(r => r.changed).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`flex flex-col w-full max-w-3xl max-h-[85vh] border-4 ${theme.border} ${theme.surface} ${theme.text}`}>
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b-2 ${theme.border}`}>
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-pink-400" />
            <span className="font-black text-sm uppercase">Version Diff</span>
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} ${theme.surface} hover:bg-red-100`}
          >
            <X size={14} />
          </button>
        </div>

        {/* Version selectors */}
        <div className={`flex-shrink-0 grid grid-cols-2 gap-4 px-4 py-3 border-b-2 ${theme.border} ${theme.panelAlt}`}>
          <div>
            <label className={`text-[10px] font-black uppercase ${theme.textMuted} block mb-1`}>Version A (older)</label>
            <select
              value={versionAId}
              onChange={e => setVersionAId(Number(e.target.value))}
              className={`w-full text-xs border-2 ${theme.border} ${theme.surface} ${theme.text} px-2 py-1.5 focus:outline-none`}
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.versionLabel}{v.isCurrent ? ' (current)' : ''} — {v.changeType}
                </option>
              ))}
            </select>
            {versionA && (
              <p className={`text-[10px] mt-1 ${theme.textMuted}`}>
                {versionA.docCountSuccess} docs · {new Date(versionA.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div>
            <label className={`text-[10px] font-black uppercase ${theme.textMuted} block mb-1`}>Version B (newer)</label>
            <select
              value={versionBId}
              onChange={e => setVersionBId(Number(e.target.value))}
              className={`w-full text-xs border-2 ${theme.border} ${theme.surface} ${theme.text} px-2 py-1.5 focus:outline-none`}
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.versionLabel}{v.isCurrent ? ' (current)' : ''} — {v.changeType}
                </option>
              ))}
            </select>
            {versionB && (
              <p className={`text-[10px] mt-1 ${theme.textMuted}`}>
                {versionB.docCountSuccess} docs · {new Date(versionB.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Summary bar */}
        {diff.length > 0 && (
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${theme.text}`}>
                {changedCount} of {diff.length} docs changed
              </span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showChangedOnly}
                  onChange={e => setShowChangedOnly(e.target.checked)}
                  className="border border-black"
                />
                <span className={theme.textMuted}>Show changed only</span>
              </label>
            </div>
            <div className="flex gap-2">
              {versionB && (
                <>
                  <button onClick={() => onExport(versionB.id, 'markdown')} className={`flex items-center gap-1 px-2 py-1 text-[11px] border-2 ${theme.border} ${theme.buttonGhost}`}>
                    <Download size={10} /> {versionB.versionLabel} .md
                  </button>
                  <button onClick={() => onExport(versionB.id, 'zip')} className={`flex items-center gap-1 px-2 py-1 text-[11px] border-2 ${theme.border} ${theme.buttonGhost}`}>
                    <Download size={10} /> .zip
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Diff table */}
        <div className="flex-1 overflow-y-auto">
          {!hasBothSnapshots ? (
            <div className={`flex items-center justify-center h-full text-sm ${theme.textMuted}`}>
              {versions.length < 2
                ? 'Need at least 2 versions to compare.'
                : 'Loading snapshot data — select both versions above.'}
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`${theme.panelAlt} border-b-2 ${theme.border}`}>
                  <th className={`text-left px-3 py-2 font-black uppercase text-[10px] ${theme.textMuted}`}>Document</th>
                  <th className={`text-center px-3 py-2 font-black uppercase text-[10px] ${theme.textMuted} w-20`}>
                    {versionA?.versionLabel ?? 'A'}
                  </th>
                  <th className={`text-center px-3 py-2 font-black uppercase text-[10px] ${theme.textMuted} w-20`}>
                    {versionB?.versionLabel ?? 'B'}
                  </th>
                  <th className={`text-right px-3 py-2 font-black uppercase text-[10px] ${theme.textMuted} w-24`}>Words Δ</th>
                </tr>
              </thead>
              <tbody>
                {displayDiff.map((row) => (
                  <tr
                    key={row.docKey}
                    className={`border-b ${theme.border} ${
                      row.changed
                        ? 'bg-yellow-50'
                        : `${theme.surface}`
                    }`}
                  >
                    <td className={`px-3 py-1.5 ${theme.text} ${row.changed ? 'font-semibold' : ''}`}>
                      {row.title}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <StatusBadge status={row.statusA} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <StatusBadge status={row.statusB} />
                    </td>
                    <td className={`px-3 py-1.5 text-right font-mono ${
                      row.wordsB > row.wordsA ? 'text-lime-600' :
                      row.wordsB < row.wordsA ? 'text-red-500' :
                      theme.textMuted
                    }`}>
                      {row.wordsB === 0 && row.wordsA === 0 ? '—' : (
                        <>
                          {row.wordsB > row.wordsA ? '+' : ''}
                          {row.wordsB - row.wordsA}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
