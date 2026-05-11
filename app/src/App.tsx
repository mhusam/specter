import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppShell } from './components/layout/AppShell'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
import HomePage from './components/pages/HomePage'
import ProjectsPage from './components/pages/ProjectsPage'
import NewProjectPage from './components/pages/NewProjectPage'
import SettingsPage from './components/pages/SettingsPage'
import { listProjects } from './api'
import type { Project } from './types'

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  async function loadProjects() {
    setIsLoadingProjects(true)
    try {
      setProjects(await listProjects())
    } catch {
      // ignore
    } finally {
      setIsLoadingProjects(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppShell>
          <Sidebar />
          <main className="h-full overflow-auto min-w-0">
            <Routes>
              <Route path="/" element={<HomePage projects={projects} loadProjects={loadProjects} />} />
              <Route
                path="/projects"
                element={
                  <ProjectsPage
                    projects={projects}
                    isLoading={isLoadingProjects}
                    loadProjects={loadProjects}
                  />
                }
              />
              <Route path="/projects/new" element={<NewProjectPage loadProjects={loadProjects} />} />
              <Route path="/projects/:id/edit" element={<NewProjectPage loadProjects={loadProjects} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </AppShell>
        <Toast />
      </ToastProvider>
    </ThemeProvider>
  )
}
