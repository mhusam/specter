import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import type { Project } from '../../types'

type HomePageProps = {
  projects: Project[]
  loadProjects: () => void
}

function statusLabel(project: Project): string {
  if (project.generatedFiles && project.generatedFiles.length > 0) return 'Generated'
  if (project.analysis) return 'Analyzed'
  return 'Draft'
}

function statusColor(project: Project): string {
  if (project.generatedFiles && project.generatedFiles.length > 0) return 'bg-lime-400 text-black'
  if (project.analysis) return 'bg-sky-300 text-black'
  return 'bg-zinc-200 text-zinc-700'
}

export default function HomePage({ projects }: HomePageProps) {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const recentProjects = [...projects].slice(-3).reverse()
  const analyzedCount = projects.filter((p) => p.analysis).length
  const totalFiles = projects.reduce((sum, p) => sum + (p.generatedFiles?.length || 0), 0)

  return (
    <div className="p-5 md:p-8 space-y-5">
      <h2 className={`text-3xl font-black ${theme.text}`}>Home</h2>

      {/* Stat cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Panel className="p-4">
          <p className={`text-sm ${theme.textMuted}`}>Total Projects</p>
          <p className={`text-3xl font-black ${theme.text}`}>{projects.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className={`text-sm ${theme.textMuted}`}>Analyzed</p>
          <p className={`text-3xl font-black ${theme.text}`}>{analyzedCount}</p>
        </Panel>
        <Panel className="p-4">
          <p className={`text-sm ${theme.textMuted}`}>Generated Files</p>
          <p className={`text-3xl font-black ${theme.text}`}>{totalFiles}</p>
        </Panel>
      </div>

      {/* Recent Projects or Getting Started */}
      {projects.length === 0 ? (
        <Panel className="p-5 space-y-3">
          <p className={`font-bold text-lg ${theme.text}`}>Getting Started</p>
          <ol className={`space-y-2 text-sm ${theme.textMuted} list-none`}>
            {[
              'Add a new project with the + button in the sidebar',
              'Fill in the questionnaire to describe your project',
              'Analyze your project with Ollama AI',
              'Generate contract files for your project',
            ].map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 ${theme.border} flex items-center justify-center text-xs font-black ${theme.text}`}>
                  {idx + 1}
                </span>
                <span className="mt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <Button variant="primary" onClick={() => navigate('/projects/new')} className="mt-2">
            Start New Project
          </Button>
        </Panel>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`font-bold text-lg ${theme.text}`}>Recent Projects</p>
            <Button variant="ghost" onClick={() => navigate('/projects/new')} className="text-xs px-2 py-1">
              + New Project
            </Button>
          </div>
          <div className="grid gap-3">
            {recentProjects.map((project) => (
              <Panel key={project.id} className="p-4 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity" alt>
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate('/projects')}
                  aria-label={`View project ${project.name}`}
                >
                  <p className={`font-semibold ${theme.text}`}>{project.name}</p>
                  <p className={`text-xs ${theme.textMuted}`}>{project.vision || 'No vision provided'}</p>
                </button>
                <span className={`ml-3 flex-shrink-0 text-xs font-bold px-2 py-0.5 border-2 ${theme.border} ${statusColor(project)}`}>
                  {statusLabel(project)}
                </span>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* Brand card */}
      <Panel alt className="p-5">
        <div className={`flex items-center gap-2 mb-2 ${theme.text}`}>
          <Sparkles size={18} />
          <span className="font-black text-lg">Specter</span>
        </div>
        <p className={theme.textMuted}>
          AI-powered requirements elicitation and documentation — running entirely on your machine.
        </p>
      </Panel>
    </div>
  )
}
