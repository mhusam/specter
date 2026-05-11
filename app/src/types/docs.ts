export type DocStatus = 'pending' | 'generating' | 'done' | 'error'

export type DocState = {
  id: number
  projectId: number
  docKey: string
  category: string
  title: string
  status: DocStatus
  content: string | null
  errorMessage: string | null
  generatedAt: string | null
}

export type DocCategory = {
  key: string
  label: string
  docs: DocState[]
}

export const CATEGORY_LABELS: Record<string, string> = {
  architecture: 'Architecture',
  business: 'Business',
  design: 'Design',
  flows: 'Flows & Diagrams',
  backend: 'Backend',
  delivery: 'Delivery',
  security: 'Security',
  agent: 'Agent / Handoff',
}
