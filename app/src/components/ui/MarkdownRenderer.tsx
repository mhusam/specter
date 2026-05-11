import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { MermaidBlock } from './MermaidBlock'

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-xl font-black mt-3 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-extrabold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="leading-relaxed my-1.5">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-black/60 pl-3 py-1 my-2 bg-black/[0.04]">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-black/20" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto border border-black/20">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="text-left px-2 py-1 bg-black/10 border border-black/10">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border border-black/10 align-top">{children}</td>,
  code: ({ children }) => <code className="px-1 py-0.5 bg-black/10 rounded text-[11px]">{children}</code>,
  pre: ({ children, ...props }) => {
    // Detect mermaid fenced blocks: ```mermaid ... ```
    const child = Array.isArray(children) ? children[0] : children
    if (
      child &&
      typeof child === 'object' &&
      'props' in child &&
      typeof child.props?.className === 'string' &&
      child.props.className.includes('language-mermaid')
    ) {
      const code = String(child.props.children ?? '').replace(/\n$/, '')
      return <MermaidBlock code={code} />
    }
    return (
      <pre
        {...props}
        className="my-2 p-3 bg-zinc-900 text-zinc-100 rounded-md overflow-x-auto text-[11px]"
      >
        {children}
      </pre>
    )
  },
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
