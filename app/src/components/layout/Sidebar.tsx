import { useNavigate, useLocation } from 'react-router-dom'
import { Home, FolderKanban, Settings2, Plus, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { SpecterLogo } from '../ui/SpecterLogo'
import type { ReactNode } from 'react'

type NavItem = {
  path: string
  icon: ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: <Home size={18} />, label: 'Home' },
  { path: '/projects', icon: <FolderKanban size={18} />, label: 'Projects' },
  { path: '/settings', icon: <Settings2 size={18} />, label: 'Settings' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, isDark, toggleColorMode } = useTheme()

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className={`h-full overflow-hidden border-r-4 px-3 py-4 flex flex-col items-center gap-3 ${theme.sidebar}`}>
      {/* Logo button */}
      <button
        title="Specter"
        aria-label="Go to home"
        onClick={() => navigate('/')}
        className={`w-12 h-12 border-2 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black transition-transform hover:scale-105 ${theme.buttonGhost}`}
      >
        <SpecterLogo size={30} />
      </button>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-2" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(item.path)}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black ${
                active ? theme.activeNav : theme.inactiveNav
              }`}
            >
              {item.icon}
            </button>
          )
        })}
      </nav>

      {/* New Project button */}
      <button
        title="New Project"
        aria-label="New Project"
        onClick={() => navigate('/projects/new')}
        className={`mt-2 w-12 h-12 rounded-lg flex items-center justify-center transition-transform focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black ${theme.buttonPrimary}`}
      >
        <Plus size={18} />
      </button>

      {/* Dark mode toggle */}
      <button
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleColorMode}
        className={`mt-auto w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black ${theme.buttonGhost}`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </aside>
  )
}
