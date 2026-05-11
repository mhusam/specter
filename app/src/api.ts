import type { Answers, Depth } from './questions'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export type AIQuestion = {
  id: string
  prompt: string
  type: 'text' | 'single' | 'multi'
  options?: { id: string; label: string }[]
}

export type Project = {
  id: number
  name: string
  depth: Depth
  vision: string | null
  answers: Answers
  analysis: string | null
  generatedPath: string | null
  generatedFiles: string[]
  createdAt: string
  updatedAt: string
  customQuestions: AIQuestion[] | null
}

export type AppSettings = {
  designConcept: string
  ollamaBaseUrl: string
  ollamaModel: string
}

export type HealthStatus = {
  ok: boolean
  dbReady: boolean
  model: string
  ollamaBaseUrl: string
  ollamaReachable: boolean
  ollamaMessage: string
}

export type ConversationMessage = {
  id: number
  projectId: number
  role: 'user' | 'assistant' | string
  content: string
  createdAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  return res.json()
}

export function listProjects() {
  return request<Project[]>('/api/projects')
}

export function createProject(payload: { name: string; depth: Depth; vision?: string; answers: Answers; customQuestions?: AIQuestion[] | null }) {
  return request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateProject(id: number, payload: { name: string; depth: Depth; vision?: string; answers: Answers; customQuestions?: AIQuestion[] | null }) {
  return request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteProject(id: number) {
  return request<void>(`/api/projects/${id}`, { method: 'DELETE' })
}

export function analyzeProject(id: number) {
  return request<Project>(`/api/projects/${id}/analyze`, { method: 'POST' })
}

export function generateProjectFiles(id: number) {
  return request<Project>(`/api/projects/${id}/generate-files`, { method: 'POST' })
}

export function getProjectFiles(id: number) {
  return request<{ generatedPath: string | null; files: { name: string; content: string }[] }>(`/api/projects/${id}/files`)
}

export function getSettings() {
  return request<AppSettings>('/api/settings')
}

export function updateSettings(payload: AppSettings) {
  return request<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(payload) })
}

export function getHealth() {
  return request<HealthStatus>('/api/health')
}

export function listProjectConversations(projectId: number) {
  return request<ConversationMessage[]>(`/api/projects/${projectId}/conversations`)
}

export function clearProjectConversations(projectId: number) {
  return request<void>(`/api/projects/${projectId}/conversations`, { method: 'DELETE' })
}

export function listOllamaModels() {
  return request<{ models: string[] }>('/api/models')
}

export async function downloadProjectZip(id: number, projectName: string) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/export/zip`)
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

async function readSseResponse(
  res: Response,
  handlers: {
    onToken?: (chunk: string) => void
    onDone?: (payload: unknown) => void
    onProgress?: (data: unknown) => void
  },
) {
  if (!res.body) throw new Error('Streaming response body is unavailable.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const eventText of events) {
      const lines = eventText.split('\n')
      let eventName = 'message'
      let data = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) data += `${line.slice(5)}\n`
      }
      data = data.replace(/\n$/, '')
      if (!data) continue
      if (eventName === 'token') {
        try {
          const parsed = JSON.parse(data) as { chunk?: string }
          handlers.onToken?.(parsed.chunk ?? '')
        } catch {
          handlers.onToken?.(data)
        }
      }
      if (eventName === 'progress') {
        try {
          handlers.onProgress?.(JSON.parse(data))
        } catch {
          // ignore
        }
      }
      if (eventName === 'done') {
        try {
          handlers.onDone?.(JSON.parse(data))
        } catch {
          handlers.onDone?.(data)
        }
      }
      if (eventName === 'error') throw new Error(data)
    }
  }
}

export async function streamProjectConversationMessage(
  projectId: number,
  message: string,
  handlers: {
    onToken?: (chunk: string) => void
    onDone?: (payload: unknown) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/conversations/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await readSseResponse(res, handlers)
}

export async function streamProjectConversationReport(
  projectId: number,
  handlers: {
    onToken?: (chunk: string) => void
    onDone?: (payload: unknown) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/conversations/report/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await readSseResponse(res, handlers)
}

export async function streamGenerateFiles(
  projectId: number,
  handlers: {
    onProgress?: (data: { file: string; done: number; total: number }) => void
    onDone?: (project: Project) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generate-files/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await readSseResponse(res, {
    onProgress: handlers.onProgress as (data: unknown) => void,
    onDone: handlers.onDone as (data: unknown) => void,
  })
}

export type AIReviewResult = {
  summary: string
  followUpQuestions: AIQuestion[]
}

export function generateAIQuestions(payload: {
  projectName: string
  depth: string
  vision?: string
  template?: string
}): Promise<{ questions: AIQuestion[] }> {
  return request('/api/ai/generate-questions', { method: 'POST', body: JSON.stringify(payload) })
}

export function reviewAnswers(payload: {
  projectName: string
  depth: string
  vision?: string
  questions: AIQuestion[]
  answers: Record<string, unknown>
}): Promise<AIReviewResult> {
  return request('/api/ai/review-answers', { method: 'POST', body: JSON.stringify(payload) })
}

export type QuestionInsights = {
  recommended: string[]
  extra: { id: string; label: string }[]
}

export type ProjectPotential = {
  tagline: string
  overview: string
  features: string[]
  targetUser: string
  techStack: string
  firstMilestone: string
}

export function getProjectPotential(payload: {
  projectName: string
  vision?: string
  template?: string
}): Promise<ProjectPotential> {
  return request('/api/ai/project-potential', { method: 'POST', body: JSON.stringify(payload) })
}

export function getQuestionInsights(payload: {
  projectName: string
  vision?: string
  questionPrompt: string
  options?: { id: string; label: string }[]
  answers: Record<string, unknown>
}): Promise<QuestionInsights> {
  return request('/api/ai/question-insights', { method: 'POST', body: JSON.stringify(payload) })
}

export type DocStateResponse = {
  id: number
  projectId: number
  docKey: string
  category: string
  title: string
  status: string
  content: string | null
  errorMessage: string | null
  generatedAt: string | null
}

export function getProjectDocs(id: number) {
  return request<DocStateResponse[]>(`/api/projects/${id}/docs`)
}

export function getProjectDoc(id: number, docKey: string) {
  return request<DocStateResponse>(`/api/projects/${id}/docs/${encodeURIComponent(docKey)}`)
}

export async function streamGenerateDocs(
  id: number,
  docKeys: string[] | null,
  handlers: {
    onProgress?: (data: { docKey: string; status: string; done: number; total: number; error?: string }) => void
    onDone?: (docs: DocStateResponse[]) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/docs/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docKeys ? { docKeys } : {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await readSseResponse(res, {
    onProgress: handlers.onProgress as (data: unknown) => void,
    onDone: handlers.onDone as (data: unknown) => void,
  })
}

// ── Spec Agent API ────────────────────────────────────────────────────────────

import type { SpecSession, SpecMessage, SpecVersion, SpecChangeType } from './types/spec'

export type { SpecSession, SpecMessage, SpecVersion, SpecChangeType }

// Sessions
export function listSpecSessions(projectId: number, status?: string) {
  const q = status ? `?status=${status}` : ''
  return request<SpecSession[]>(`/api/projects/${projectId}/spec/sessions${q}`)
}

export function createSpecSession(projectId: number, name?: string) {
  return request<SpecSession>(`/api/projects/${projectId}/spec/sessions`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getSpecSession(projectId: number, sessionId: number) {
  return request<SpecSession>(`/api/projects/${projectId}/spec/sessions/${sessionId}`)
}

export function updateSpecSession(projectId: number, sessionId: number, body: { name?: string; status?: string; phase?: string }) {
  return request<SpecSession>(`/api/projects/${projectId}/spec/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteSpecSession(projectId: number, sessionId: number) {
  return request<void>(`/api/projects/${projectId}/spec/sessions/${sessionId}`, { method: 'DELETE' })
}

export function triggerSpecCheckpoint(projectId: number, sessionId: number) {
  return request<{ session: SpecSession; checkpointMessage: SpecMessage | null }>(
    `/api/projects/${projectId}/spec/sessions/${sessionId}/checkpoint`,
    { method: 'POST' },
  )
}

// Versions
export function listSpecVersions(projectId: number) {
  return request<SpecVersion[]>(`/api/projects/${projectId}/spec/versions`)
}

export function getSpecVersion(projectId: number, versionId: number) {
  return request<SpecVersion>(`/api/projects/${projectId}/spec/versions/${versionId}`)
}

export function setCurrentSpecVersion(projectId: number, versionId: number) {
  return request<{ success: boolean; versionId: number }>(
    `/api/projects/${projectId}/spec/versions/${versionId}/set-current`,
    { method: 'PATCH' },
  )
}

export function getSpecVersionExportUrl(projectId: number, versionId: number, format: 'markdown' | 'zip' = 'markdown') {
  return `${API_BASE}/api/projects/${projectId}/spec/versions/${versionId}/export?format=${format}`
}

export function duplicateSpecSession(projectId: number, sessionId: number) {
  return request<SpecSession>(
    `/api/projects/${projectId}/spec/sessions/${sessionId}/duplicate`,
    { method: 'POST' },
  )
}

// SSE: Retry failed docs in an existing version (no new version created)
export type RetryFailedHandlers = {
  onDocStart?: (data: { docKey: string; title: string; index: number; total: number }) => void
  onDocComplete?: (data: { docKey: string; status: string; wordCount: number }) => void
  onDocError?: (data: { docKey: string; error: string }) => void
  onRetryComplete?: (data: { versionId: number; successCount: number; errorCount: number; fixedCount: number }) => void
  onError?: (msg: string) => void
}

export async function streamRetryFailedDocs(
  projectId: number,
  versionId: number,
  handlers: RetryFailedHandlers,
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/spec/versions/${versionId}/retry-failed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const eventText of events) {
      const lines = eventText.split('\n')
      let eventName = 'message', data = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5) + '\n'
      }
      data = data.replace(/\n$/, '')
      if (!data) continue
      try {
        const parsed = JSON.parse(data)
        if (eventName === 'doc_start') handlers.onDocStart?.(parsed)
        else if (eventName === 'doc_complete') handlers.onDocComplete?.(parsed)
        else if (eventName === 'doc_error') handlers.onDocError?.(parsed)
        else if (eventName === 'retry_complete') handlers.onRetryComplete?.(parsed)
        else if (eventName === 'error') handlers.onError?.(data)
      } catch { /* ignore parse errors */ }
    }
  }
}

// SSE: Spec chat
export async function streamSpecChat(
  projectId: number,
  sessionId: number,
  message: string,
  handlers: {
    onToken?: (chunk: string) => void
    onPhaseTransition?: (newPhase: string) => void
    onPhaseSuggestion?: (suggestedPhase: string, reason: string) => void
    onCheckpointSuggested?: (messageCount: number) => void
    onDone?: (payload: { message: SpecMessage; phase: string }) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/spec/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const eventText of events) {
      const lines = eventText.split('\n')
      let eventName = 'message'
      let data = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5) + '\n'
      }
      data = data.replace(/\n$/, '')
      if (!data) continue
      try {
        if (eventName === 'token') {
          const parsed = JSON.parse(data)
          handlers.onToken?.(parsed.chunk ?? '')
        } else if (eventName === 'phase_transition') {
          const parsed = JSON.parse(data)
          handlers.onPhaseTransition?.(parsed.newPhase)
        } else if (eventName === 'phase_suggestion') {
          const parsed = JSON.parse(data)
          handlers.onPhaseSuggestion?.(parsed.suggestedPhase, parsed.reason)
        } else if (eventName === 'checkpoint_suggested') {
          const parsed = JSON.parse(data)
          handlers.onCheckpointSuggested?.(parsed.messageCount)
        } else if (eventName === 'done') {
          handlers.onDone?.(JSON.parse(data))
        } else if (eventName === 'error') {
          throw new Error(data)
        }
      } catch (e) {
        if (eventName === 'error') throw e
      }
    }
  }
}

// SSE: Spec generation
export type SpecGenerationHandlers = {
  onDocStart?: (data: { docKey: string; title: string; index: number; total: number }) => void
  onDocComplete?: (data: { docKey: string; status: string; wordCount: number }) => void
  onDocError?: (data: { docKey: string; error: string }) => void
  onGenerationComplete?: (data: { versionId: number; versionLabel: string; successCount: number; errorCount: number }) => void
}

export async function streamSpecGeneration(
  projectId: number,
  sessionId: number,
  changeType: SpecChangeType,
  changeSummary: string,
  handlers: SpecGenerationHandlers,
) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/spec/sessions/${sessionId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changeType, changeSummary }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const eventText of events) {
      const lines = eventText.split('\n')
      let eventName = 'message'
      let data = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5) + '\n'
      }
      data = data.replace(/\n$/, '')
      if (!data) continue
      try {
        const parsed = JSON.parse(data)
        if (eventName === 'doc_start') handlers.onDocStart?.(parsed)
        else if (eventName === 'doc_complete') handlers.onDocComplete?.(parsed)
        else if (eventName === 'doc_error') handlers.onDocError?.(parsed)
        else if (eventName === 'generation_complete') handlers.onGenerationComplete?.(parsed)
        else if (eventName === 'error') throw new Error(data)
      } catch (e) {
        if (eventName === 'error') throw e
      }
    }
  }
}

export async function streamRegenerateDoc(
  id: number,
  docKey: string,
  handlers: {
    onToken?: (chunk: string) => void
    onDone?: (doc: DocStateResponse) => void
  },
) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/docs/${encodeURIComponent(docKey)}/regenerate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await readSseResponse(res, {
    onToken: handlers.onToken,
    onDone: handlers.onDone as (data: unknown) => void,
  })
}
