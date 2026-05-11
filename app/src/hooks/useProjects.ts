import { useState, useCallback } from 'react'
import { listProjects, deleteProject as apiDeleteProject } from '../api'
import type { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listProjects()
      setProjects(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteProject = useCallback(async (id: number) => {
    await apiDeleteProject(id)
    await loadProjects()
  }, [loadProjects])

  return { projects, isLoading, error, loadProjects, deleteProject }
}
