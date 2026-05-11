import { useState } from 'react'
import { X, Loader2, Zap } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { SpecChangeType } from '../../types/spec'

type Props = {
  onClose: () => void
  onGenerate: (changeType: SpecChangeType, changeSummary: string) => void
  isGenerating: boolean
  hasExistingVersion: boolean
}

const CHANGE_TYPES: { value: SpecChangeType; label: string; desc: string }[] = [
  { value: 'initial', label: 'Initial (v1.0.0)', desc: 'First complete spec package' },
  { value: 'major',   label: 'Major',            desc: 'Breaking scope changes — bumps major version' },
  { value: 'minor',   label: 'Minor',            desc: 'New features or sections added' },
  { value: 'patch',   label: 'Patch',            desc: 'Small corrections or clarifications' },
]

export function SpecGenerateModal({ onClose, onGenerate, isGenerating, hasExistingVersion }: Props) {
  const { theme } = useTheme()
  const defaultType: SpecChangeType = hasExistingVersion ? 'minor' : 'initial'
  const [changeType, setChangeType] = useState<SpecChangeType>(defaultType)
  const [changeSummary, setChangeSummary] = useState('')

  function handleSubmit() {
    onGenerate(changeType, changeSummary.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-full max-w-md border-4 ${theme.border} ${theme.surface} ${theme.text}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${theme.border}`}>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-pink-400" />
            <span className="font-black text-sm uppercase">Generate Spec Package</span>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className={`w-7 h-7 flex items-center justify-center border-2 ${theme.border} ${theme.surface} hover:bg-red-100 disabled:opacity-40`}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <p className={`text-xs font-bold uppercase mb-2 ${theme.textMuted}`}>Version Type</p>
            <div className="space-y-2">
              {CHANGE_TYPES.map((ct) => {
                const disabled = ct.value === 'initial' && hasExistingVersion
                return (
                  <label
                    key={ct.value}
                    className={`flex items-start gap-3 p-2 border-2 cursor-pointer transition-colors ${
                      changeType === ct.value
                        ? 'bg-yellow-200 border-black text-black'
                        : `${theme.border} ${theme.surface} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`
                    }`}
                  >
                    <input
                      type="radio"
                      name="changeType"
                      value={ct.value}
                      checked={changeType === ct.value}
                      disabled={disabled}
                      onChange={() => setChangeType(ct.value)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs font-black">{ct.label}</p>
                      <p className={`text-[10px] ${changeType === ct.value ? 'text-zinc-700' : theme.textMuted}`}>{ct.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className={`text-xs font-bold uppercase block mb-1 ${theme.textMuted}`}>
              Change Summary <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Describe what changed or why this version is being generated..."
              rows={3}
              className={`w-full border-2 ${theme.border} ${theme.surface} ${theme.text} p-2 text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
            />
          </div>

          <p className={`text-[11px] ${theme.textMuted}`}>
            This will generate all 22 specification documents using Ollama and create an immutable versioned snapshot.
          </p>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-2 px-4 py-3 border-t-2 ${theme.border}`}>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className={`px-3 py-1.5 text-sm border-2 ${theme.buttonGhost} disabled:opacity-40`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm border-2 ${theme.buttonPrimary} disabled:opacity-40`}
          >
            {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {isGenerating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
