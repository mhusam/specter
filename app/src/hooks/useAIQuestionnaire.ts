import { useState, useCallback } from 'react'
import { generateAIQuestions, reviewAnswers } from '../api'
import type { AIQuestion, AIReviewResult } from '../api'

export function useAIQuestionnaire() {
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<AIQuestion[]>([])
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateQuestions = useCallback(async (params: {
    projectName: string
    depth: string
    vision?: string
    template?: string
  }) => {
    setIsGeneratingQuestions(true)
    setError(null)
    try {
      const result = await generateAIQuestions(params)
      setGeneratedQuestions(result.questions)
      return result.questions
    } catch (e) {
      setError((e as Error).message)
      return []
    } finally {
      setIsGeneratingQuestions(false)
    }
  }, [])

  const runReview = useCallback(async (params: {
    projectName: string
    depth: string
    vision?: string
    questions: AIQuestion[]
    answers: Record<string, unknown>
  }) => {
    setIsReviewing(true)
    setError(null)
    try {
      const result = await reviewAnswers(params)
      setReviewResult(result)
      return result
    } catch (e) {
      setError((e as Error).message)
      return null
    } finally {
      setIsReviewing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setGeneratedQuestions([])
    setReviewResult(null)
    setError(null)
  }, [])

  return {
    isGeneratingQuestions,
    isReviewing,
    generatedQuestions,
    reviewResult,
    error,
    generateQuestions,
    runReview,
    reset,
  }
}
