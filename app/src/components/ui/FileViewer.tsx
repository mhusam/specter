import { useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { useTheme } from '../../contexts/ThemeContext'

type FileEntry = { name: string; content: string }

type FileViewerProps = {
  files: FileEntry[]
}

export function FileViewer({ files }: FileViewerProps) {
  const { theme } = useTheme()
  const [activeIndex, setActiveIndex] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (files.length === 0) {
    return (
      <div className={`p-6 text-center ${theme.textMuted} text-sm border-2 ${theme.border}`}>
        No files generated yet.
      </div>
    )
  }

  const activeFile = files[activeIndex]

  function handleCopy() {
    navigator.clipboard.writeText(activeFile.content).then(() => {
      setCopiedIndex(activeIndex)
      setTimeout(() => setCopiedIndex(null), 2000)
    })
  }

  function handleDownload() {
    const blob = new Blob([activeFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`border-2 ${theme.border} flex h-[480px]`}>
      {/* File tabs sidebar */}
      <div className={`w-52 flex-shrink-0 border-r-2 ${theme.border} overflow-y-auto ${theme.surface}`}>
        {files.map((file, idx) => (
          <button
            key={file.name}
            onClick={() => setActiveIndex(idx)}
            className={`w-full text-left px-3 py-2 text-xs font-medium border-b ${theme.border} truncate transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black ${
              activeIndex === idx
                ? 'bg-yellow-200 text-black font-bold'
                : `${theme.surface} ${theme.textMuted} hover:bg-yellow-100`
            }`}
            title={file.name}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* File content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className={`flex items-center justify-between px-3 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
          <span className={`text-xs font-bold truncate ${theme.text}`}>{activeFile.name}</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2 py-1 text-xs border ${theme.border} ${theme.buttonGhost} transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black`}
              title="Copy file content"
            >
              {copiedIndex === activeIndex ? <Check size={12} /> : <Copy size={12} />}
              {copiedIndex === activeIndex ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1 px-2 py-1 text-xs border ${theme.border} ${theme.buttonGhost} transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black`}
              title="Download file"
            >
              <Download size={12} />
              Download
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-4 ${theme.surface}`}>
          <MarkdownRenderer content={activeFile.content} />
        </div>
      </div>
    </div>
  )
}
