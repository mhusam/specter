export type Option = { id: string; label: string }
export type QuestionType = 'single' | 'multi' | 'text'
export type Depth = 'basic' | 'intermediate' | 'advanced'

export type Question = {
  id: string
  section: string
  prompt: string
  type: QuestionType
  options?: Option[]
  required?: boolean
  placeholder?: string
  depth: Depth
}

export type Answers = Record<string, string | string[]>

export const DEPTH_OPTIONS: Option[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

export const QUESTIONS: Question[] = [
  { id: 'depth', section: 'Plan', prompt: 'Choose plan depth', type: 'single', required: true, options: DEPTH_OPTIONS, depth: 'basic' },
  { id: 'project_name', section: 'Project Identity', prompt: 'What is the project name?', type: 'text', required: true, depth: 'basic' },
  { id: 'project_vision', section: 'Project Identity', prompt: 'What is the short one-line project vision?', type: 'text', required: true, depth: 'basic' },
  { id: 'scope', section: 'Scope', prompt: 'What scope level best fits this project?', type: 'single', required: true, depth: 'basic', options: [{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'enterprise', label: 'Enterprise' }, { id: 'distributed', label: 'Distributed' }] },
  { id: 'type', section: 'Type', prompt: 'What are we building?', type: 'single', required: true, depth: 'basic', options: [{ id: 'website', label: 'Website' }, { id: 'webapp', label: 'WebApp' }, { id: 'desktop', label: 'Desktop' }, { id: 'mobile', label: 'Mobile' }, { id: 'api', label: 'API' }, { id: 'library', label: 'Library' }, { id: 'cli', label: 'CLI' }, { id: 'automation', label: 'Automation' }] },
  { id: 'platform_target', section: 'Target', prompt: 'Which platforms are required?', type: 'multi', required: true, depth: 'basic', options: [{ id: 'web', label: 'Web' }, { id: 'macos', label: 'macOS' }, { id: 'windows', label: 'Windows' }, { id: 'linux', label: 'Linux' }, { id: 'ios', label: 'iOS' }, { id: 'android', label: 'Android' }, { id: 'cross_platform', label: 'CrossPlatform' }] },
  { id: 'audience_target', section: 'Target', prompt: 'Primary audience?', type: 'single', required: true, depth: 'basic', options: [{ id: 'internal_team', label: 'InternalTeam' }, { id: 'b2b_clients', label: 'B2BClients' }, { id: 'public_users', label: 'PublicUsers' }, { id: 'developers', label: 'Developers' }] },
  { id: 'performance', section: 'Quality', prompt: 'Performance target?', type: 'single', required: true, depth: 'basic', options: [{ id: 'basic', label: 'Basic' }, { id: 'optimized', label: 'Optimized' }, { id: 'high_performance', label: 'HighPerformance' }] },
  { id: 'security', section: 'Quality', prompt: 'Security posture?', type: 'single', required: true, depth: 'basic', options: [{ id: 'standard', label: 'Standard' }, { id: 'hardened', label: 'Hardened' }, { id: 'compliance_grade', label: 'ComplianceGrade' }] },

  { id: 'problem', section: 'Project Identity', prompt: 'What problem are we solving?', type: 'text', required: true, depth: 'intermediate' },
  { id: 'success_outcome', section: 'Project Identity', prompt: 'What outcome defines success?', type: 'text', required: true, depth: 'intermediate' },
  { id: 'domain', section: 'Domain', prompt: 'Which domain best fits the project?', type: 'single', required: true, depth: 'intermediate', options: [{ id: 'ecommerce', label: 'Ecommerce' }, { id: 'fintech', label: 'Fintech' }, { id: 'health', label: 'Health' }, { id: 'edtech', label: 'EdTech' }, { id: 'saas', label: 'SaaS' }, { id: 'ai_tools', label: 'AI Tools' }, { id: 'operations', label: 'Operations' }, { id: 'media', label: 'Media' }, { id: 'custom', label: 'Custom' }] },
  { id: 'stage', section: 'Stage', prompt: 'Current lifecycle stage?', type: 'single', required: true, depth: 'intermediate', options: [{ id: 'prototype', label: 'Prototype' }, { id: 'mvp', label: 'MVP' }, { id: 'production', label: 'Production' }, { id: 'scale', label: 'Scale' }, { id: 'legacy_modernization', label: 'LegacyModernization' }] },
  { id: 'testing_mode', section: 'Quality', prompt: 'Should this phase run with or without testing?', type: 'single', required: true, depth: 'intermediate', options: [{ id: 'without_testing', label: 'Without testing' }, { id: 'with_testing', label: 'With testing' }] },
  { id: 'repo_model', section: 'Delivery', prompt: 'Repository model?', type: 'single', required: true, depth: 'intermediate', options: [{ id: 'monorepo', label: 'Monorepo' }, { id: 'polyrepo', label: 'Polyrepo' }] },
  { id: 'architecture', section: 'Delivery', prompt: 'Architecture style?', type: 'single', required: true, depth: 'intermediate', options: [{ id: 'monolith', label: 'Monolith' }, { id: 'modular_monolith', label: 'ModularMonolith' }, { id: 'microservices', label: 'Microservices' }, { id: 'event_driven', label: 'EventDriven' }] },

  { id: 'integrations', section: 'Delivery', prompt: 'List required external integrations/APIs.', type: 'text', required: false, depth: 'advanced', placeholder: 'Stripe, Slack, OpenAI' },
  { id: 'constraints', section: 'Constraints', prompt: 'Main constraints (timeline, budget, legal, team)?', type: 'text', required: false, depth: 'advanced' },
  { id: 'risks', section: 'Constraints', prompt: 'Biggest known risks?', type: 'text', required: false, depth: 'advanced' },
]

const DEPTH_RANK: Record<Depth, number> = {
  basic: 1,
  intermediate: 2,
  advanced: 3,
}

export function getDepth(value?: string): Depth {
  if (value === 'basic' || value === 'intermediate' || value === 'advanced') return value
  return 'basic'
}

export function filterQuestionsByDepth(allAnswers: Answers): Question[] {
  const selectedDepth = getDepth(typeof allAnswers.depth === 'string' ? allAnswers.depth : undefined)
  const rank = DEPTH_RANK[selectedDepth]
  return QUESTIONS.filter((q) => DEPTH_RANK[q.depth] <= rank)
}
