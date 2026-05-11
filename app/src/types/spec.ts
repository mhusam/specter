export type SpecPhase = 'discovery' | 'deep_dive' | 'gap_analysis' | 'confirmation' | 'completed'
export type SpecSessionStatus = 'active' | 'archived' | 'completed'
export type SpecMessageType = 'chat' | 'checkpoint' | 'phase_transition' | 'generation_trigger'
export type SpecChangeType = 'initial' | 'major' | 'minor' | 'patch'

export type ElicitedSummaryJsonb = {
  functional: string[]
  nonfunctional: string[]
  constraints: string[]
  actors: string[]
  flows: string[]
}

export type SpecSession = {
  id: number
  projectId: number
  name: string
  status: SpecSessionStatus
  phase: SpecPhase
  producedVersionId: number | null
  elicitedSummary: string | null
  elicitedSummaryJsonb: ElicitedSummaryJsonb | null
  checkpointCount: number
  messageCount: number
  createdAt: string
  updatedAt: string
  messages?: SpecMessage[]
}

export type SpecMessage = {
  id: number
  sessionId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  messageType: SpecMessageType
  phaseAtSend: SpecPhase | null
  createdAt: string
}

export type SpecDocSnapshot = {
  title: string
  category: string
  content: string | null
  status: 'done' | 'error'
  wordCount: number
  errorMessage: string | null
  generatedAt: string | null
}

export type SpecVersion = {
  id: number
  projectId: number
  sessionId: number | null
  versionMajor: number
  versionMinor: number
  versionPatch: number
  versionLabel: string
  changeType: SpecChangeType
  changeSummary: string | null
  docsSnapshot: Record<string, SpecDocSnapshot> | null
  sessionContextSnapshot: {
    sessionName: string
    phase: SpecPhase
    messageCount: number
    checkpointCount: number
    elicitedSummaryJsonb: ElicitedSummaryJsonb | null
  } | null
  isCurrent: boolean
  docCountSuccess: number
  docCountError: number
  createdAt: string
}

export type DocGenerationStatus = {
  docKey: string
  title: string
  status: 'pending' | 'generating' | 'done' | 'error'
  wordCount?: number
  error?: string
}
