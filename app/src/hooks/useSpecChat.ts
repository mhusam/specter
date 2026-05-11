import { useState, useCallback } from 'react'
import { streamSpecChat } from '../api'
import type { SpecMessage, SpecPhase } from '../types/spec'

export type PhaseSuggestion = {
  suggestedPhase: SpecPhase
  reason: string
}

export function useSpecChat(projectId: number) {
  const [messages, setMessages] = useState<SpecMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [liveReply, setLiveReply] = useState('')
  const [currentPhase, setCurrentPhase] = useState<SpecPhase>('discovery')
  const [phaseSuggestion, setPhaseSuggestion] = useState<PhaseSuggestion | null>(null)
  const [checkpointSuggested, setCheckpointSuggested] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback((sessionMessages: SpecMessage[], phase: SpecPhase) => {
    setMessages(sessionMessages)
    setCurrentPhase(phase)
    setLiveReply('')
    setError(null)
    setPhaseSuggestion(null)
    setCheckpointSuggested(false)
  }, [])

  const sendMessage = useCallback(async (sessionId: number, message: string) => {
    if (!message.trim() || isStreaming) return
    const outgoing = message.trim()
    setIsStreaming(true)
    setLiveReply('')
    setError(null)
    setPhaseSuggestion(null)
    setCheckpointSuggested(false)

    // Optimistically add user message
    const optimisticUser: SpecMessage = {
      id: Date.now(),
      sessionId,
      role: 'user',
      content: outgoing,
      messageType: 'chat',
      phaseAtSend: currentPhase,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUser])

    try {
      await streamSpecChat(projectId, sessionId, outgoing, {
        onToken: (chunk) => setLiveReply(prev => prev + chunk),
        onPhaseTransition: (newPhase) => {
          setCurrentPhase(newPhase as SpecPhase)
        },
        onPhaseSuggestion: (suggestedPhase, reason) => {
          setPhaseSuggestion({ suggestedPhase: suggestedPhase as SpecPhase, reason })
        },
        onCheckpointSuggested: () => {
          setCheckpointSuggested(true)
        },
        onDone: (payload) => {
          setMessages(prev => [
            ...prev.filter(m => m.id !== optimisticUser.id),
            optimisticUser,
            payload.message,
          ])
          setCurrentPhase(payload.phase as SpecPhase)
          setLiveReply('')
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
      setLiveReply('')
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
    } finally {
      setIsStreaming(false)
    }
  }, [projectId, isStreaming, currentPhase])

  const dismissPhaseSuggestion = useCallback(() => {
    setPhaseSuggestion(null)
  }, [])

  const dismissCheckpointSuggestion = useCallback(() => {
    setCheckpointSuggested(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLiveReply('')
    setError(null)
    setPhaseSuggestion(null)
    setCheckpointSuggested(false)
  }, [])

  return {
    messages,
    isStreaming,
    liveReply,
    currentPhase,
    setCurrentPhase,
    phaseSuggestion,
    checkpointSuggested,
    error,
    loadMessages,
    sendMessage,
    dismissPhaseSuggestion,
    dismissCheckpointSuggestion,
    clearMessages,
  }
}
