import { useState, useCallback } from 'react'
import {
  listSpecVersions,
  getSpecVersion,
  setCurrentSpecVersion,
  getSpecVersionExportUrl,
} from '../api'
import type { SpecVersion } from '../types/spec'

export function useSpecVersions(projectId: number) {
  const [versions, setVersions] = useState<SpecVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<SpecVersion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const loadVersions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await listSpecVersions(projectId)
      setVersions(data)
      return data
    } catch {
      setVersions([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const viewVersion = useCallback(async (versionId: number) => {
    setIsLoading(true)
    try {
      const version = await getSpecVersion(projectId, versionId)
      setSelectedVersion(version)
      return version
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const restoreVersion = useCallback(async (versionId: number) => {
    setIsRestoring(true)
    try {
      await setCurrentSpecVersion(projectId, versionId)
      setVersions(prev => prev.map(v => ({
        ...v,
        isCurrent: v.id === versionId,
      })))
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(prev => prev ? { ...prev, isCurrent: true } : null)
      }
    } finally {
      setIsRestoring(false)
    }
  }, [projectId, selectedVersion])

  const exportVersion = useCallback((versionId: number, format: 'zip' | 'markdown' = 'markdown') => {
    const url = getSpecVersionExportUrl(projectId, versionId, format)
    const a = document.createElement('a')
    a.href = url
    a.click()
  }, [projectId])

  const currentVersion = versions.find(v => v.isCurrent) ?? null

  return {
    versions,
    selectedVersion,
    setSelectedVersion,
    currentVersion,
    isLoading,
    isRestoring,
    loadVersions,
    viewVersion,
    restoreVersion,
    exportVersion,
  }
}
