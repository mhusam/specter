import { useState, useCallback } from 'react'
import {
  listProjectConversations,
  streamProjectConversationMessage,
  streamProjectConversationReport,
  clearProjectConversations as apiClearConversations,
} from '../api'
import type { ConversationMessage } from '../types'

export function useConversations() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [liveReply, setLiveReply] = useState('')

  const loadConversation = useCallback(async (projectId: number) => {
    const data = await listProjectConversations(projectId)
    setMessages(data)
  }, [])

  const sendChatMessage = useCallback(async (projectId: number, message: string) => {
    if (!message.trim()) return
    const outgoing = message.trim()
    setIsStreaming(true)
    setLiveReply('')
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        projectId,
        role: 'user',
        content: outgoing,
        createdAt: new Date().toISOString(),
      },
    ])
    setChatInput('')
    try {
      await streamProjectConversationMessage(projectId, outgoing, {
        onToken: (chunk) => setLiveReply((prev) => prev + chunk),
      })
      const updated = await listProjectConversations(projectId)
      setMessages(updated)
      setLiveReply('')
    } catch (e) {
      setLiveReply('')
      const updated = await listProjectConversations(projectId).catch(() => [] as ConversationMessage[])
      setMessages(updated)
      throw e
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const generateReport = useCallback(async (projectId: number) => {
    setIsStreaming(true)
    setLiveReply('')
    try {
      await streamProjectConversationReport(projectId, {
        onToken: (chunk) => setLiveReply((prev) => prev + chunk),
      })
      const updated = await listProjectConversations(projectId)
      setMessages(updated)
      setLiveReply('')
    } catch (e) {
      setLiveReply('')
      throw e
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const clearConversations = useCallback(async (projectId: number) => {
    await apiClearConversations(projectId)
    setMessages([])
    setLiveReply('')
  }, [])

  return {
    messages,
    chatInput,
    setChatInput,
    isStreaming,
    liveReply,
    loadConversation,
    sendChatMessage,
    generateReport,
    clearConversations,
  }
}
