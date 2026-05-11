import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { DocCategory, DocState, DocStatus } from '../../types/docs'

type DocCategoryViewerProps = {
  docs: DocCategory[]
  doneCount: number
  totalCount: number
  isGenerating: boolean
  generatingDocKey: string | null
  liveContent: string
  overallProgress: { done: number; total: number }
  onGenerateAll: () => void
  onGenerateCategory: (cat: string) => void
  onRegenerateDoc: (docKey: string) => void
  onFetchContent: (docKey: string) => Promise<string | null>
  readOnly?: boolean
}

function StatusDot({ status }: { status: DocStatus }) {
  const colorMap: Record<DocStatus, string> = {
    done: 'bg-lime-500',
    generating: 'bg-sky-400',
    pending: 'bg-zinc-400',
    error: 'bg-red-400',
  }
  return <span className={`flex-shrink-0 w-2 h-2 rounded-full ${colorMap[status]}`} />
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

function CategorySection({
  category,
  selectedDocKey,
  isGenerating,
  generatingDocKey,
  readOnly,
  onSelectDoc,
  onGenerateCategory,
}: {
  category: DocCategory
  selectedDocKey: string | null
  isGenerating: boolean
  generatingDocKey: string | null
  readOnly?: boolean
  onSelectDoc: (docKey: string) => void
  onGenerateCategory: (cat: string) => void
}) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(true)

  const doneInCategory = category.docs.filter(d => d.status === 'done').length

  return (
    <div className={`border-b-2 ${theme.border}`}>
      <div className={`flex items-center justify-between px-2 py-1.5 ${theme.panelAlt}`}>
        <button
          onClick={() => setIsOpen(v => !v)}
          className={`flex items-center gap-1 text-xs font-black uppercase ${theme.text} flex-1 text-left focus-visible:ring-2 focus-visible:ring-black`}
        >
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {category.label}
          <span className={`ml-1 px-1 py-0.5 text-[10px] font-black border ${theme.border} ${theme.surface} leading-none`}>
            {doneInCategory}/{category.docs.length}
          </span>
        </button>
        {!readOnly && (
          <button
            onClick={() => onGenerateCategory(category.key)}
            disabled={isGenerating}
            className={`px-1.5 py-0.5 text-[10px] font-bold border-2 ${theme.border} ${theme.buttonGhost} disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
          >
            Generate
          </button>
        )}
      </div>

      {isOpen && (
        <div>
          {category.docs.map(doc => {
            const isSelected = selectedDocKey === doc.docKey
            const isThisGenerating = generatingDocKey === doc.docKey
            return (
              <button
                key={doc.docKey}
                onClick={() => onSelectDoc(doc.docKey)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:ring-black ${
                  isSelected
                    ? 'bg-yellow-200 text-black'
                    : `${theme.surface} ${theme.text} hover:opacity-80`
                }`}
              >
                {isThisGenerating ? (
                  <Loader2 size={8} className="animate-spin flex-shrink-0" />
                ) : (
                  <StatusDot status={doc.status} />
                )}
                <span className="truncate">{doc.title}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DocContentPanel({
  doc,
  isGenerating,
  generatingDocKey,
  liveContent,
  readOnly,
  onRegenerateDoc,
  onFetchContent,
}: {
  doc: DocState
  isGenerating: boolean
  generatingDocKey: string | null
  liveContent: string
  readOnly?: boolean
  onRegenerateDoc: (docKey: string) => void
  onFetchContent: (docKey: string) => Promise<string | null>
}) {
  const { theme } = useTheme()
  const [hasFetchedContent, setHasFetchedContent] = useState(false)
  const isThisGenerating = generatingDocKey === doc.docKey

  useEffect(() => {
    setHasFetchedContent(false)
  }, [doc.docKey])

  useEffect(() => {
    if (doc.status === 'done' && doc.content === null && !hasFetchedContent) {
      setHasFetchedContent(true)
      onFetchContent(doc.docKey)
    }
  }, [doc.status, doc.content, doc.docKey, hasFetchedContent, onFetchContent])

  return (
    <>
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
        <p className={`font-black text-sm ${theme.text}`}>{doc.title}</p>
        {!readOnly && (
          <button
            onClick={() => onRegenerateDoc(doc.docKey)}
            disabled={isGenerating}
            className={`flex items-center gap-1 px-2 py-1 text-xs border-2 ${theme.border} ${theme.buttonGhost} disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
          >
            <RefreshCw size={11} />
            Regenerate
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {doc.status === 'pending' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className={`text-sm ${theme.textMuted}`}>This document hasn't been generated yet.</p>
            <button
              onClick={() => onRegenerateDoc(doc.docKey)}
              disabled={isGenerating}
              className={`px-3 py-2 text-sm border-2 ${theme.buttonPrimary} disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
            >
              Generate
            </button>
          </div>
        )}

        {doc.status === 'generating' && isThisGenerating && (
          <div>
            {liveContent ? (
              <MarkdownRenderer content={liveContent} />
            ) : (
              <TypingIndicator />
            )}
          </div>
        )}

        {doc.status === 'generating' && !isThisGenerating && (
          <div className="flex items-center justify-center h-full">
            <TypingIndicator />
          </div>
        )}

        {doc.status === 'done' && (
          doc.content ? (
            <MarkdownRenderer content={doc.content} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <TypingIndicator />
            </div>
          )
        )}

        {doc.status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm font-semibold text-red-600">
              {doc.errorMessage || 'An error occurred while generating this document.'}
            </p>
            <button
              onClick={() => onRegenerateDoc(doc.docKey)}
              disabled={isGenerating}
              className={`px-3 py-2 text-sm border-2 ${theme.buttonPrimary} disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export function DocCategoryViewer({
  docs,
  doneCount,
  totalCount,
  isGenerating,
  generatingDocKey,
  liveContent,
  overallProgress,
  onGenerateAll,
  onGenerateCategory,
  onRegenerateDoc,
  onFetchContent,
  readOnly = false,
}: DocCategoryViewerProps) {
  const { theme } = useTheme()
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null)

  const allDocs = docs.flatMap(cat => cat.docs)
  const selectedDoc = selectedDocKey ? allDocs.find(d => d.docKey === selectedDocKey) ?? null : null

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: category tree */}
      <div className={`flex-shrink-0 w-[260px] border-r-4 ${theme.border} flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
          <p className={`text-xs font-black ${theme.text}`}>
            <span className="font-black">{doneCount}</span>
            <span className={theme.textMuted}> / {totalCount} docs</span>
          </p>
          {!readOnly && (
            <button
              onClick={onGenerateAll}
              disabled={isGenerating}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold border-2 ${theme.border} ${theme.buttonPrimary} disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-black`}
            >
              {isGenerating ? <Loader2 size={10} className="animate-spin" /> : null}
              Generate All
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isGenerating && overallProgress.total > 0 && (
          <div className={`flex-shrink-0 px-3 py-2 border-b-2 ${theme.border} ${theme.panelAlt}`}>
            <p className={`text-[10px] ${theme.textMuted} mb-1`}>
              {overallProgress.done} / {overallProgress.total}
            </p>
            <div className="flex gap-0.5 flex-wrap">
              {Array.from({ length: overallProgress.total }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 border ${theme.border} ${
                    i < overallProgress.done ? 'bg-lime-400' : theme.surface
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category list */}
        <div className="flex-1 overflow-y-auto">
          {docs.length === 0 ? (
            <div className={`p-4 text-xs ${theme.textMuted}`}>
              No documents loaded. Use "Generate All" to get started.
            </div>
          ) : (
            docs.map(category => (
              <CategorySection
                key={category.key}
                category={category}
                selectedDocKey={selectedDocKey}
                isGenerating={isGenerating}
                generatingDocKey={generatingDocKey}
                readOnly={readOnly}
                onSelectDoc={setSelectedDocKey}
                onGenerateCategory={onGenerateCategory}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel: doc content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedDoc ? (
          <div className={`flex-1 flex items-center justify-center ${theme.panelAlt}`}>
            <p className={`text-sm ${theme.textMuted}`}>Select a document to view its content.</p>
          </div>
        ) : (
          <DocContentPanel
            doc={selectedDoc}
            isGenerating={isGenerating}
            generatingDocKey={generatingDocKey}
            liveContent={liveContent}
            readOnly={readOnly}
            onRegenerateDoc={onRegenerateDoc}
            onFetchContent={onFetchContent}
          />
        )}
      </div>
    </div>
  )
}
