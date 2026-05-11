export type Template = {
  id: string
  name: string
  description: string
  answers: Record<string, string | string[]>
}

export const TEMPLATES: Template[] = [
  {
    id: 'saas-mvp',
    name: 'SaaS MVP',
    description: 'Web application for B2B clients at MVP stage',
    answers: {
      depth: 'intermediate',
      scope: 'medium',
      type: 'webapp',
      domain: 'saas',
      stage: 'mvp',
      architecture: 'monolith',
      repo_model: 'monorepo',
      audience_target: 'b2b_clients',
      performance: 'optimized',
      security: 'standard',
      platform_target: ['web'],
    },
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Cross-platform mobile application',
    answers: {
      depth: 'intermediate',
      scope: 'medium',
      type: 'mobile',
      stage: 'mvp',
      architecture: 'monolith',
      repo_model: 'monorepo',
      audience_target: 'public_users',
      performance: 'optimized',
      security: 'standard',
      platform_target: ['ios', 'android'],
    },
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Backend API service for developers',
    answers: {
      depth: 'advanced',
      scope: 'small',
      type: 'api',
      domain: 'saas',
      stage: 'production',
      architecture: 'modular_monolith',
      repo_model: 'polyrepo',
      audience_target: 'developers',
      performance: 'high_performance',
      security: 'hardened',
      platform_target: ['web'],
    },
  },
  {
    id: 'cli-tool',
    name: 'CLI Tool',
    description: 'Command-line utility for developers',
    answers: {
      depth: 'basic',
      scope: 'small',
      type: 'cli',
      audience_target: 'developers',
      performance: 'basic',
      security: 'standard',
      platform_target: ['macos', 'linux', 'windows'],
    },
  },
]
