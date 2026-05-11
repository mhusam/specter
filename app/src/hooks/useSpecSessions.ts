import { useState, useCallback } from 'react'
import {
  listSpecSessions,
  createSpecSession,
  getSpecSession,
  updateSpecSession as apiUpdateSession,
  deleteSpecSession as apiDeleteSession,
  triggerSpecCheckpoint,
  duplicateSpecSession as apiDuplicateSession,
} from '../api'
import type { SpecSession } from '../types/spec'

export function useSpecSessions(projectId: number) {
  const [sessions, setSessions] = useState<SpecSession[]>([])
  const [activeSession, setActiveSession] = useState<SpecSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [checkpointLoading, setCheckpointLoading] = useState(false)

  const loadSessions = useCallback(async (status?: string) => {
    setIsLoading(true)
    try {
      const data = await listSpecSessions(projectId, status)
      setSessions(data)
    } catch {
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const createSession = useCallback(async (name?: string) => {
    setIsCreating(true)
    try {
      const session = await createSpecSession(projectId, name)
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      return session
    } finally {
      setIsCreating(false)
    }
  }, [projectId])

  const selectSession = useCallback(async (sessionId: number) => {
    setIsLoading(true)
    try {
      const session = await getSpecSession(projectId, sessionId)
      setActiveSession(session)
      return session
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const renameSession = useCallback(async (sessionId: number, name: string) => {
    const updated = await apiUpdateSession(projectId, sessionId, { name })
    setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
    setActiveSession(prev => prev?.id === sessionId ? updated : prev)
    return updated
  }, [projectId])

  const archiveSession = useCallback(async (sessionId: number) => {
    const updated = await apiUpdateSession(projectId, sessionId, { status: 'archived' })
    setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
    if (activeSession?.id === sessionId) setActiveSession(updated)
    return updated
  }, [projectId, activeSession])

  const restoreSession = useCallback(async (sessionId: number) => {
    const updated = await apiUpdateSession(projectId, sessionId, { status: 'active' })
    setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
    if (activeSession?.id === sessionId) setActiveSession(updated)
    return updated
  }, [projectId, activeSession])

  const deleteSession = useCallback(async (sessionId: number) => {
    await apiDeleteSession(projectId, sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSession?.id === sessionId) setActiveSession(null)
  }, [projectId, activeSession])

  const runCheckpoint = useCallback(async (sessionId: number) => {
    setCheckpointLoading(true)
    try {
      const result = await triggerSpecCheckpoint(projectId, sessionId)
      // Refresh the active session to get updated elicited summary
      const updated = await getSpecSession(projectId, sessionId)
      setActiveSession(updated)
      setSessions(prev => prev.map(s => s.id === sessionId ? updated : s))
      return result
    } finally {
      setCheckpointLoading(false)
    }
  }, [projectId])

  const duplicateSession = useCallback(async (sessionId: number) => {
    const session = await apiDuplicateSession(projectId, sessionId)
    setSessions(prev => [session, ...prev])
    setActiveSession(session)
    return session
  }, [projectId])

  const refreshActiveSession = useCallback(async () => {
    if (!activeSession) return
    const updated = await getSpecSession(projectId, activeSession.id)
    setActiveSession(updated)
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [projectId, activeSession])

  return {
    sessions,
    activeSession,
    setActiveSession,
    isLoading,
    isCreating,
    checkpointLoading,
    loadSessions,
    createSession,
    selectSession,
    renameSession,
    archiveSession,
    restoreSession,
    deleteSession,
    duplicateSession,
    runCheckpoint,
    refreshActiveSession,
  }
}
