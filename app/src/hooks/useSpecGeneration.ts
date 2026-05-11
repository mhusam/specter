import { useState, useCallback } from 'react'
import { streamSpecGeneration, streamRetryFailedDocs } from '../api'
import type { DocGenerationStatus } from '../types/spec'
import type { SpecChangeType } from '../types/spec'

export type GenerationResult = {
  versionId: number
  versionLabel: string
  successCount: number
  errorCount: number
}

export function useSpecGeneration(projectId: number) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [docStatuses, setDocStatuses] = useState<DocGenerationStatus[]>([])
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (
    sessionId: number,
    changeType: SpecChangeType,
    changeSummary: string,
    onComplete?: (result: GenerationResult) => void,
  ) => {
    setIsGenerating(true)
    setDocStatuses([])
    setResult(null)
    setError(null)

    try {
      await streamSpecGeneration(projectId, sessionId, changeType, changeSummary, {
        onDocStart: ({ docKey, title }) => {
          setDocStatuses(prev => {
            const existing = prev.find(d => d.docKey === docKey)
            if (existing) {
              return prev.map(d => d.docKey === docKey ? { ...d, status: 'generating' } : d)
            }
            return [...prev, { docKey, title, status: 'generating' }]
          })
        },
        onDocComplete: ({ docKey, wordCount }) => {
          setDocStatuses(prev =>
            prev.map(d => d.docKey === docKey ? { ...d, status: 'done', wordCount } : d)
          )
        },
        onDocError: ({ docKey, error: errMsg }) => {
          setDocStatuses(prev =>
            prev.map(d => d.docKey === docKey ? { ...d, status: 'error', error: errMsg } : d)
          )
        },
        onGenerationComplete: (genResult) => {
          const r: GenerationResult = {
            versionId: genResult.versionId,
            versionLabel: genResult.versionLabel,
            successCount: genResult.successCount,
            errorCount: genResult.errorCount,
          }
          setResult(r)
          onComplete?.(r)
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [projectId])

  const retryFailed = useCallback(async (
    versionId: number,
    onComplete?: (result: GenerationResult) => void,
  ) => {
    setIsGenerating(true)
    setError(null)
    try {
      await streamRetryFailedDocs(projectId, versionId, {
        onDocStart: ({ docKey, title }) => {
          setDocStatuses(prev =>
            prev.map(d => d.docKey === docKey ? { ...d, status: 'generating' } : d)
          )
        },
        onDocComplete: ({ docKey, wordCount }) => {
          setDocStatuses(prev =>
            prev.map(d => d.docKey === docKey ? { ...d, status: 'done', wordCount } : d)
          )
        },
        onDocError: ({ docKey, error: errMsg }) => {
          setDocStatuses(prev =>
            prev.map(d => d.docKey === docKey ? { ...d, status: 'error', error: errMsg } : d)
          )
        },
        onRetryComplete: (data) => {
          const r: GenerationResult = {
            versionId: data.versionId,
            versionLabel: '',
            successCount: data.successCount,
            errorCount: data.errorCount,
          }
          setResult(r)
          onComplete?.(r)
        },
        onError: (msg) => setError(msg),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setIsGenerating(false)
    }
  }, [projectId])

  const reset = useCallback(() => {
    setDocStatuses([])
    setResult(null)
    setError(null)
  }, [])

  const doneCount = docStatuses.filter(d => d.status === 'done').length
  const errorCount = docStatuses.filter(d => d.status === 'error').length
  const totalCount = docStatuses.length

  return {
    isGenerating,
    docStatuses,
    result,
    error,
    doneCount,
    errorCount,
    totalCount,
    generate,
    retryFailed,
    reset,
  }
}
