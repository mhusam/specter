import { useState, useRef } from 'react'
import { Loader2, Zap, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { getProjectPotential } from '../../api'
import type { ProjectPotential } from '../../api'

type Props = {
  projectName: string
  vision?: string
  template?: string
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${theme.textMuted}`}>
        {label}
      </p>
      {children}
    </div>
  )
}

export function ProjectPotentialPanel({ projectName, vision, template }: Props) {
  const { theme } = useTheme()
  const [sample, setSample] = useState<ProjectPotential | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track what was used for the last generation so we can detect staleness
  const generatedWith = useRef<{ name: string; vision: string } | null>(null)

  const nameReady = projectName.trim().length >= 2
  const visionReady = (vision || '').trim().length >= 5
  const isReady = nameReady && visionReady

  const isStale =
    !!sample &&
    generatedWith.current !== null &&
    (generatedWith.current.name !== projectName.trim() ||
      generatedWith.current.vision !== (vision || '').trim())

  async function generate() {
    if (!isReady || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await getProjectPotential({ projectName, vision, template })
      setSample(result)
      generatedWith.current = { name: projectName.trim(), vision: (vision || '').trim() }
    } catch {
      setError('Could not generate sample. Check Ollama is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col border-4 ${theme.border} ${theme.surface} overflow-hidden h-full`}>

      {/* ── Header ── */}
      <div className={`flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b-2 ${theme.border} ${theme.panelAlt}`}>
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-yellow-500 flex-shrink-0" />
          <p className={`text-xs font-black uppercase tracking-wide ${theme.text}`}>
            AI Build Potential
          </p>
        </div>
        {sample && !loading && (
          <button
            onClick={generate}
            disabled={!isReady}
            title="Regenerate with current details"
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold border-2 ${theme.border} ${theme.buttonGhost} hover:opacity-80 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
          >
            <RefreshCw size={9} />
            Regenerate
          </button>
        )}
      </div>

      {/* ── Live project details strip (always visible, updates as user types) ── */}
      <div className={`flex-shrink-0 px-4 py-2.5 border-b-2 ${theme.border} ${isStale ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-black text-sm leading-tight truncate ${theme.text}`}>
              {projectName.trim() || <span className={`font-normal italic ${theme.textMuted}`}>No name yet</span>}
            </p>
            {(vision || '').trim() ? (
              <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${theme.textMuted}`}>
                {vision}
              </p>
            ) : (
              <p className={`text-xs mt-0.5 italic ${theme.textMuted} opacity-60`}>
                Add a vision for better results
              </p>
            )}
            {template && template !== 'General' && (
              <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 bg-yellow-300 text-black border border-black/20 uppercase">
                {template}
              </span>
            )}
          </div>

          {/* Staleness warning */}
          {isStale && (
            <div className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-yellow-700">
              <AlertCircle size={10} />
              Changed
            </div>
          )}
        </div>

        {/* Stale banner */}
        {isStale && (
          <button
            onClick={generate}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border-2 border-yellow-500 bg-yellow-300 text-black hover:opacity-80 focus-visible:ring-2 focus-visible:ring-black"
          >
            <RefreshCw size={10} />
            Regenerate with updated details
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Not yet generated */}
        {!sample && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 h-full px-6">
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={generate}
              disabled={!isReady}
              className={`group flex flex-col items-center gap-3 px-6 py-5 border-4 border-black bg-yellow-300 text-black shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0_0_#000] disabled:translate-x-0 disabled:translate-y-0 focus-visible:ring-2 focus-visible:ring-black`}
            >
              <Sparkles size={28} className="group-hover:scale-110 transition-transform" />
              <span className="font-black text-sm uppercase tracking-wide">Generate Sample</span>
            </button>

            {/* Hint about what's needed */}
            {!isReady && (
              <div className={`text-center space-y-0.5`}>
                <p className={`text-[10px] ${nameReady ? 'text-lime-600' : theme.textMuted}`}>
                  {nameReady ? '✓' : '○'} Project name
                </p>
                <p className={`text-[10px] ${visionReady ? 'text-lime-600' : theme.textMuted}`}>
                  {visionReady ? '✓' : '○'} Project vision
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <div className="relative flex items-center justify-center w-12 h-12">
              <Loader2 size={48} className={`animate-spin ${theme.textMuted} absolute`} />
              <Sparkles size={20} className="text-yellow-400 relative" />
            </div>
            <p className={`text-xs ${theme.textMuted}`}>Generating project sample…</p>
          </div>
        )}

        {/* Error after previous generation */}
        {error && sample && !loading && (
          <p className="text-xs text-red-500 text-center px-4 pt-4">{error}</p>
        )}

        {/* Sample */}
        {sample && !loading && (
          <div className="px-4 py-4 space-y-4">
            {/* Tagline */}
            {sample.tagline && (
              <p className={`text-sm italic ${theme.textMuted} border-b-2 ${theme.border} pb-3`}>
                "{sample.tagline}"
              </p>
            )}

            {sample.overview && (
              <Section label="Overview">
                <p className={`text-xs leading-relaxed ${theme.text}`}>{sample.overview}</p>
              </Section>
            )}

            {sample.features.length > 0 && (
              <Section label="Key Features">
                <ul className="space-y-1.5">
                  {sample.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${theme.text}`}>
                      <span className="flex-shrink-0 mt-0.5 w-4 h-4 bg-yellow-300 text-black border border-black/20 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {sample.targetUser && (
              <Section label="Built for">
                <p className={`text-xs leading-relaxed ${theme.text}`}>{sample.targetUser}</p>
              </Section>
            )}

            {sample.techStack && (
              <Section label="Tech Approach">
                <p className={`text-xs leading-relaxed font-mono ${theme.text}`}>{sample.techStack}</p>
              </Section>
            )}

            {sample.firstMilestone && (
              <Section label="First Working Version">
                <div className="border-l-4 border-yellow-400 pl-3 py-1">
                  <p className={`text-xs leading-relaxed ${theme.text}`}>{sample.firstMilestone}</p>
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
