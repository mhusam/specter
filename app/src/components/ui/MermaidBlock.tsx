import { useEffect, useRef, useState, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import mermaid from 'mermaid'
import { Code, Eye, Copy, Check, AlertCircle, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

type Props = {
  code: string
}

// ── Full-screen lightbox ──────────────────────────────────────────────────────

function MermaidLightbox({
  svg,
  code,
  onClose,
}: {
  svg: string
  code: string
  onClose: () => void
}) {
  const { theme, isDark } = useTheme()
  const [scale, setScale] = useState(1)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'preview' | 'source'>('preview')

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const zoom = (delta: number) =>
    setScale(s => Math.min(4, Math.max(0.25, parseFloat((s + delta).toFixed(2)))))

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className={`flex-shrink-0 flex items-center justify-between px-4 py-2 border-b-2 ${isDark ? 'border-white bg-zinc-900' : 'border-black bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex items-center">
          <button
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase border-r-2 ${isDark ? 'border-white' : 'border-black'} transition-colors ${
              tab === 'preview' ? 'bg-pink-400 text-black' : `${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-zinc-500'} hover:opacity-80`
            }`}
          >
            <Eye size={11} /> Preview
          </button>
          <button
            onClick={() => setTab('source')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase transition-colors ${
              tab === 'source' ? 'bg-pink-400 text-black' : `${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-zinc-500'} hover:opacity-80`
            }`}
          >
            <Code size={11} /> Source
          </button>
        </div>

        {/* Zoom controls (preview only) */}
        {tab === 'preview' && (
          <div className={`flex items-center gap-1 border-2 ${isDark ? 'border-white' : 'border-black'}`}>
            <button
              onClick={() => zoom(-0.25)}
              title="Zoom out"
              className={`w-7 h-7 flex items-center justify-center border-r-2 ${isDark ? 'border-white text-white hover:bg-zinc-700' : 'border-black text-black hover:bg-zinc-100'}`}
            >
              <ZoomOut size={12} />
            </button>
            <span className={`px-2 text-xs font-mono font-bold min-w-[44px] text-center ${isDark ? 'text-white' : 'text-black'}`}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => zoom(0.25)}
              title="Zoom in"
              className={`w-7 h-7 flex items-center justify-center border-x-2 ${isDark ? 'border-white text-white hover:bg-zinc-700' : 'border-black text-black hover:bg-zinc-100'}`}
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={() => setScale(1)}
              title="Reset zoom"
              className={`w-7 h-7 flex items-center justify-center ${isDark ? 'text-white hover:bg-zinc-700' : 'text-black hover:bg-zinc-100'}`}
            >
              <RotateCcw size={11} />
            </button>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>mermaid</span>
          <button
            onClick={handleCopy}
            title="Copy source"
            className={`flex items-center gap-1 px-2 py-1 text-xs border-2 ${isDark ? 'border-white text-white hover:bg-zinc-700' : 'border-black text-black hover:bg-zinc-100'}`}
          >
            {copied ? <Check size={11} className="text-lime-500" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className={`w-8 h-8 flex items-center justify-center border-2 ${isDark ? 'border-white text-white hover:bg-zinc-700' : 'border-black text-black hover:bg-red-50'}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Diagram / source area */}
      <div
        className="flex-1 overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {tab === 'preview' ? (
          <div className="min-h-full flex items-center justify-center p-8">
            <div
              className="origin-center transition-transform duration-150"
              style={{ transform: `scale(${scale})` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        ) : (
          <pre className="m-0 p-6 h-full bg-zinc-950 text-zinc-100 text-sm leading-relaxed whitespace-pre font-mono overflow-auto">
            {code.trim()}
          </pre>
        )}
      </div>

      {/* Footer hint */}
      <div className={`flex-shrink-0 flex items-center justify-center py-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        Press Esc or click outside to close
        {tab === 'preview' && '  ·  Scroll to pan  ·  Use zoom controls above'}
      </div>
    </div>,
    document.body,
  )
}

// ── Inline block ─────────────────────────────────────────────────────────────

export function MermaidBlock({ code }: Props) {
  const { theme, isDark } = useTheme()
  const uid = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'preview' | 'source'>('preview')
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRendering(true)
    setError(null)

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: 13,
      securityLevel: 'loose',
    })

    mermaid.render(`mermaid-${uid}`, code.trim())
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg)
          setRendering(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to render diagram'
          setError(msg.replace(/^Error:\s*/i, '').split('\n')[0])
          setRendering(false)
          setView('source')
        }
      })

    return () => { cancelled = true }
  }, [code, uid, isDark])

  function handleCopy() {
    navigator.clipboard.writeText(code.trim()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleCloseLightbox = useCallback(() => setLightboxOpen(false), [])

  return (
    <>
      <div className={`my-3 border-2 ${theme.border} ${theme.surface}`}>
        {/* Toolbar */}
        <div className={`flex items-center justify-between px-3 py-1.5 border-b-2 ${theme.border} ${theme.panelAlt}`}>
          {/* Tab switcher */}
          <div className="flex items-center">
            <button
              onClick={() => setView('preview')}
              disabled={!!error}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase border-r-2 ${theme.border} transition-colors disabled:opacity-40 ${
                view === 'preview'
                  ? 'bg-pink-400 text-black'
                  : `${theme.surface} ${theme.textMuted} hover:opacity-80`
              }`}
            >
              <Eye size={10} /> Preview
            </button>
            <button
              onClick={() => setView('source')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase transition-colors ${
                view === 'source'
                  ? 'bg-pink-400 text-black'
                  : `${theme.surface} ${theme.textMuted} hover:opacity-80`
              }`}
            >
              <Code size={10} /> Source
            </button>
          </div>

          {/* Right: label + error + copy + expand */}
          <div className="flex items-center gap-1.5">
            {error && (
              <span
                className="flex items-center gap-1 text-[10px] text-red-500 font-semibold truncate max-w-[180px]"
                title={error}
              >
                <AlertCircle size={10} className="flex-shrink-0" />
                {error}
              </span>
            )}
            <span className={`text-[10px] font-mono ${theme.textMuted}`}>mermaid</span>
            <button
              onClick={handleCopy}
              title="Copy source"
              className={`w-6 h-6 flex items-center justify-center border ${theme.border} ${theme.surface} hover:opacity-80`}
            >
              {copied ? <Check size={10} className="text-lime-500" /> : <Copy size={10} />}
            </button>
            {/* Full-screen button — only when rendered successfully */}
            {!error && !rendering && (
              <button
                onClick={() => setLightboxOpen(true)}
                title="Full-screen preview"
                className={`w-6 h-6 flex items-center justify-center border-2 ${theme.border} bg-pink-400 text-black hover:opacity-80`}
              >
                <Maximize2 size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Inline content */}
        <div className="min-h-[60px]">
          {view === 'preview' ? (
            <div className="p-4 flex justify-center overflow-x-auto">
              {rendering ? (
                <div className={`text-xs ${theme.textMuted} py-6 animate-pulse`}>Rendering diagram…</div>
              ) : (
                <div
                  ref={containerRef}
                  className="max-w-full [&_svg]:max-w-full [&_svg]:h-auto cursor-zoom-in"
                  title="Click expand button for full view"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )}
            </div>
          ) : (
            <pre className="m-0 p-4 bg-zinc-900 text-zinc-100 text-[11px] leading-relaxed overflow-x-auto whitespace-pre font-mono rounded-none">
              {code.trim()}
            </pre>
          )}
        </div>
      </div>

      {/* Lightbox portal */}
      {lightboxOpen && svg && (
        <MermaidLightbox
          svg={svg}
          code={code}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  )
}
