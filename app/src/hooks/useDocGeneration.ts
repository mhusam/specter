import { useState, useCallback } from 'react'
import { getProjectDocs, getProjectDoc, streamGenerateDocs, streamRegenerateDoc } from '../api'
import type { DocStateResponse } from '../api'
import type { DocState, DocCategory } from '../types/docs'
import { CATEGORY_LABELS } from '../types/docs'

const DOC_CATALOG_ORDER = [
  'architecture', 'business', 'design', 'flows', 'backend', 'delivery', 'agent', 'security'
]

function mapDoc(d: DocStateResponse): DocState {
  return {
    id: d.id,
    projectId: d.projectId,
    docKey: d.docKey,
    category: d.category,
    title: d.title,
    status: d.status as DocState['status'],
    content: d.content,
    errorMessage: d.errorMessage,
    generatedAt: d.generatedAt,
  }
}

export function useDocGeneration() {
  const [docs, setDocs] = useState<DocState[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingDocKey, setGeneratingDocKey] = useState<string | null>(null)
  const [liveContent, setLiveContent] = useState<string>('')
  const [overallProgress, setOverallProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

  const loadDocs = useCallback(async (projectId: number) => {
    try {
      const data = await getProjectDocs(projectId)
      setDocs(data.map(mapDoc))
    } catch {
      setDocs([])
    }
  }, [])

  const generateAll = useCallback(async (projectId: number) => {
    setIsGenerating(true)
    setOverallProgress({ done: 0, total: 31 })
    try {
      await streamGenerateDocs(projectId, null, {
        onProgress: (data) => {
          setDocs(prev => prev.map(d => d.docKey === data.docKey ? { ...d, status: data.status as DocState['status'] } : d))
          setOverallProgress({ done: data.done, total: data.total })
        },
        onDone: (allDocs) => {
          setDocs(allDocs.map(mapDoc))
          setOverallProgress({ done: allDocs.filter(d => d.status === 'done').length, total: allDocs.length })
        },
      })
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const generateCategory = useCallback(async (projectId: number, category: string) => {
    const categoryDocKeys = docs.filter(d => d.category === category).map(d => d.docKey)
    if (!categoryDocKeys.length) return
    setIsGenerating(true)
    setOverallProgress({ done: 0, total: categoryDocKeys.length })
    try {
      await streamGenerateDocs(projectId, categoryDocKeys, {
        onProgress: (data) => {
          setDocs(prev => prev.map(d => d.docKey === data.docKey ? { ...d, status: data.status as DocState['status'] } : d))
          setOverallProgress({ done: data.done, total: data.total })
        },
        onDone: (updatedDocs) => {
          const updatedMap = new Map(updatedDocs.map(d => [d.docKey, d]))
          setDocs(prev => prev.map(d => updatedMap.has(d.docKey) ? mapDoc(updatedMap.get(d.docKey)!) : d))
        },
      })
    } finally {
      setIsGenerating(false)
    }
  }, [docs])

  const regenerateDoc = useCallback(async (projectId: number, docKey: string) => {
    setGeneratingDocKey(docKey)
    setLiveContent('')
    setDocs(prev => prev.map(d => d.docKey === docKey ? { ...d, status: 'generating' } : d))
    try {
      await streamRegenerateDoc(projectId, docKey, {
        onToken: (chunk) => setLiveContent(prev => prev + chunk),
        onDone: (doc) => {
          setDocs(prev => prev.map(d => d.docKey === docKey ? mapDoc(doc) : d))
          setLiveContent('')
        },
      })
    } catch {
      setDocs(prev => prev.map(d => d.docKey === docKey ? { ...d, status: 'error' } : d))
      setLiveContent('')
    } finally {
      setGeneratingDocKey(null)
    }
  }, [])

  const fetchDocContent = useCallback(async (projectId: number, docKey: string) => {
    try {
      const data = await getProjectDoc(projectId, docKey)
      setDocs(prev => prev.map(d => d.docKey === docKey ? mapDoc(data) : d))
      return data.content
    } catch {
      return null
    }
  }, [])

  const docsByCategory: DocCategory[] = DOC_CATALOG_ORDER
    .filter(cat => docs.some(d => d.category === cat))
    .map(cat => ({
      key: cat,
      label: CATEGORY_LABELS[cat] || cat,
      docs: docs.filter(d => d.category === cat),
    }))

  const doneCount = docs.filter(d => d.status === 'done').length

  return {
    docs,
    docsByCategory,
    doneCount,
    totalCount: docs.length,
    isGenerating,
    generatingDocKey,
    liveContent,
    overallProgress,
    loadDocs,
    generateAll,
    generateCategory,
    regenerateDoc,
    fetchDocContent,
  }
}
