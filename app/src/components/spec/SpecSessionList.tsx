import { useState } from 'react'
import { Plus, Archive, Loader2, MoreVertical, RotateCcw, Trash2, Copy } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { SpecPhaseBadge } from './SpecPhaseBadge'
import type { SpecSession } from '../../types/spec'

type Props = {
  sessions: SpecSession[]
  activeSession: SpecSession | null
  isLoading: boolean
  isCreating: boolean
  statusFilter: 'active' | 'archived'
  onFilterChange: (f: 'active' | 'archived') => void
  onSelect: (session: SpecSession) => void
  onCreate: () => void
  onRename: (session: SpecSession) => void
  onArchive: (session: SpecSession) => void
  onRestore: (session: SpecSession) => void
  onDelete: (session: SpecSession) => void
  onDuplicate: (session: SpecSession) => void
}

export function SpecSessionList({
  sessions, activeSession, isLoading, isCreating,
  statusFilter, onFilterChange,
  onSelect, onCreate, onRename, onArchive, onRestore, onDelete, onDuplicate,
}: Props) {
  const { theme } = useTheme()
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  function toggleMenu(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setMenuOpenId(prev => prev === id ? null : id)
  }

  function closeMenu() {
    setMenuOpenId(null)
  }

  return (
    <div className={`flex flex-col h-full border-r-4 ${theme.border} ${theme.surface}`} onClick={closeMenu}>
      {/* Header */}
      <div className={`flex-shrink-0 px-3 py-2 border-b-2 ${theme.border} flex items-center justify-between`}>
        <span className={`text-xs font-black uppercase ${theme.textMuted}`}>Spec Sessions</span>
        <button
          onClick={onCreate}
          disabled={isCreating}
          title="New session"
          className={`w-6 h-6 flex items-center justify-center border-2 ${theme.border} ${theme.buttonPrimary} disabled:opacity-40`}
        >
          {isCreating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        </button>
      </div>

      {/* Filter tabs */}
      <div className={`flex-shrink-0 flex border-b-2 ${theme.border}`}>
        {(['active', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`flex-1 py-1.5 text-[11px] font-black uppercase transition-colors ${
              statusFilter === f
                ? `bg-pink-400 text-black border-b-0`
                : `${theme.surface} ${theme.textMuted} hover:opacity-80`
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className={`flex items-center justify-center h-20 ${theme.textMuted}`}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full px-3 py-8 text-center gap-2`}>
            <p className={`text-xs ${theme.textMuted}`}>
              {statusFilter === 'archived' ? 'No archived sessions.' : 'No sessions yet. Create one to start.'}
            </p>
            {statusFilter === 'active' && (
              <button
                onClick={onCreate}
                disabled={isCreating}
                className={`mt-1 px-3 py-1.5 text-xs border-2 ${theme.buttonPrimary} flex items-center gap-1`}
              >
                <Plus size={11} /> New Session
              </button>
            )}
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSession?.id === session.id
            return (
              <div
                key={session.id}
                onClick={() => onSelect(session)}
                className={`relative flex items-start gap-2 px-3 py-2.5 border-b-2 ${theme.border} cursor-pointer transition-colors ${
                  isActive ? 'bg-yellow-200 text-black' : `${theme.surface} ${theme.text} hover:opacity-80`
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{session.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <SpecPhaseBadge phase={session.phase} size="sm" />
                    <span className={`text-[10px] ${isActive ? 'text-zinc-600' : theme.textMuted}`}>
                      {session.messageCount} msg
                    </span>
                    {session.checkpointCount > 0 && (
                      <span className={`text-[10px] ${isActive ? 'text-zinc-600' : theme.textMuted}`}>
                        · {session.checkpointCount} ckpt
                      </span>
                    )}
                  </div>
                </div>

                {/* Context menu */}
                <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => toggleMenu(e, session.id)}
                    className={`w-5 h-5 flex items-center justify-center border ${theme.border} ${
                      isActive ? 'bg-yellow-100 border-black' : `${theme.surface}`
                    } hover:opacity-80`}
                  >
                    <MoreVertical size={10} />
                  </button>

                  {menuOpenId === session.id && (
                    <div className={`absolute right-0 top-6 z-20 w-36 border-2 ${theme.border} ${theme.surface} shadow-[4px_4px_0_0_currentColor]`}>
                      <button
                        onClick={() => { onRename(session); closeMenu() }}
                        className={`w-full text-left px-3 py-1.5 text-xs ${theme.text} hover:bg-yellow-100`}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => { onDuplicate(session); closeMenu() }}
                        className={`w-full text-left px-3 py-1.5 text-xs ${theme.text} hover:bg-yellow-100 flex items-center gap-1.5`}
                      >
                        <Copy size={10} /> Duplicate
                      </button>
                      {session.status === 'active' ? (
                        <button
                          onClick={() => { onArchive(session); closeMenu() }}
                          className={`w-full text-left px-3 py-1.5 text-xs ${theme.text} hover:bg-yellow-100 flex items-center gap-1.5`}
                        >
                          <Archive size={10} /> Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => { onRestore(session); closeMenu() }}
                          className={`w-full text-left px-3 py-1.5 text-xs ${theme.text} hover:bg-yellow-100 flex items-center gap-1.5`}
                        >
                          <RotateCcw size={10} /> Restore
                        </button>
                      )}
                      <button
                        onClick={() => { onDelete(session); closeMenu() }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
