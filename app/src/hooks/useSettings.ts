import { useState, useCallback } from 'react'
import { getSettings, updateSettings, getHealth, listOllamaModels } from '../api'
import type { AppSettings, HealthStatus } from '../types'

const defaultSettings: AppSettings = {
  designConcept: 'brutalism',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'gemma3:12b',
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const loaded = await getSettings()
      setSettings({ ...loaded, designConcept: 'brutalism' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (payload: AppSettings) => {
    setIsLoading(true)
    try {
      const updated = await updateSettings({ ...payload, designConcept: 'brutalism' })
      setSettings(updated)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const checkHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getHealth()
      setHealth(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadModels = useCallback(async () => {
    try {
      const data = await listOllamaModels()
      setAvailableModels(data.models)
    } catch {
      setAvailableModels([])
    }
  }, [])

  return {
    settings,
    setSettings,
    health,
    isLoading,
    availableModels,
    loadSettings,
    saveSettings,
    checkHealth,
    loadModels,
  }
}
