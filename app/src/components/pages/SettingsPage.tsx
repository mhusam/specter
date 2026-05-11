import { useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { useSettings } from '../../hooks/useSettings'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

export default function SettingsPage() {
  const { theme } = useTheme()
  const toast = useToast()
  const {
    settings,
    setSettings,
    health,
    isLoading,
    availableModels,
    loadSettings,
    saveSettings,
    checkHealth,
    loadModels,
  } = useSettings()

  useEffect(() => {
    loadSettings().catch(() => {})
    loadModels()
  }, [loadSettings, loadModels])

  async function handleSave() {
    try {
      await saveSettings(settings)
      toast.success('Settings saved!')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleHealthCheck() {
    try {
      await checkHealth()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="p-5 md:p-8 space-y-5 max-w-2xl">
      <h2 className={`text-3xl font-black ${theme.text}`}>Settings</h2>

      <Panel className="p-4 space-y-4">
        {/* Design Concept */}
        <div>
          <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>Design Concept</label>
          <input
            value="Neo Brutalism"
            disabled
            className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} opacity-50 focus:outline-none`}
          />
        </div>

        {/* Ollama Base URL */}
        <div>
          <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>Ollama Base URL</label>
          <input
            value={settings.ollamaBaseUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, ollamaBaseUrl: e.target.value }))}
            className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
          />
        </div>

        {/* Ollama Model */}
        <div>
          <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>Ollama Model</label>
          {availableModels.length > 0 ? (
            <select
              value={settings.ollamaModel}
              onChange={(e) => setSettings((prev) => ({ ...prev, ollamaModel: e.target.value }))}
              className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
            >
              {!availableModels.includes(settings.ollamaModel) && (
                <option value={settings.ollamaModel}>{settings.ollamaModel} (current)</option>
              )}
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={settings.ollamaModel}
              onChange={(e) => setSettings((prev) => ({ ...prev, ollamaModel: e.target.value }))}
              placeholder="e.g. gemma4:31b"
              className={`w-full border-2 p-2 bg-transparent ${theme.border} ${theme.text} focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
            />
          )}
          {availableModels.length === 0 && (
            <p className={`text-xs mt-1 ${theme.textMuted}`}>
              Could not load models from Ollama. Enter model name manually.
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button variant="ghost" onClick={handleHealthCheck} disabled={isLoading}>
            Health Check
          </Button>
        </div>
      </Panel>

      {health && (
        <Panel className="p-4 text-sm space-y-1.5">
          <p className={`font-bold ${theme.text} mb-2`}>Health Status</p>
          {[
            { label: 'DB Ready', value: health.dbReady ? 'Yes' : 'No' },
            { label: 'Ollama URL', value: health.ollamaBaseUrl },
            { label: 'Model', value: health.model },
            { label: 'Reachable', value: health.ollamaReachable ? 'Yes' : 'No' },
            { label: 'Message', value: health.ollamaMessage },
          ].map(({ label, value }) => (
            <p key={label}>
              <span className={`font-semibold ${theme.text}`}>{label}: </span>
              <span className={theme.textMuted}>{value}</span>
            </p>
          ))}
        </Panel>
      )}
    </div>
  )
}
