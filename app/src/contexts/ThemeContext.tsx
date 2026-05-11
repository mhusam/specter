import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Theme } from '../types'

const light: Theme = {
  bg: 'bg-[#FFDE03]',
  shell: 'max-w-7xl mx-auto rounded-none border-4 border-black bg-white',
  sidebar: 'bg-white border-black',
  panel: 'bg-white border-4 border-black rounded-none shadow-[6px_6px_0_0_#000]',
  panelAlt: 'bg-yellow-200 border-4 border-black rounded-none',
  buttonPrimary: 'bg-pink-400 text-black border-2 border-black font-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0_0_#000]',
  buttonGhost: 'border-2 border-black bg-white hover:bg-zinc-100 text-black',
  buttonDanger: 'bg-red-400 text-black border-2 border-black font-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0_0_#000]',
  textMuted: 'text-zinc-700',
  text: 'text-black',
  border: 'border-black',
  surface: 'bg-white',
  blobPrimary: 'bg-pink-400/25',
  blobSecondary: 'bg-cyan-300/25',
  blobTertiary: 'bg-yellow-300/25',
  activeNav: 'bg-black text-white',
  inactiveNav: 'hover:bg-zinc-100 text-zinc-700',
}

const dark: Theme = {
  bg: 'bg-zinc-950',
  shell: 'max-w-7xl mx-auto rounded-none border-4 border-white bg-zinc-950',
  sidebar: 'bg-zinc-900 border-white',
  panel: 'bg-zinc-900 border-4 border-white rounded-none shadow-[6px_6px_0_0_#f4f4f5]',
  panelAlt: 'bg-zinc-800 border-4 border-white rounded-none',
  buttonPrimary: 'bg-yellow-300 text-black border-2 border-white font-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0_0_#f4f4f5]',
  buttonGhost: 'border-2 border-white bg-zinc-900 text-white hover:bg-zinc-800',
  buttonDanger: 'bg-red-500 text-white border-2 border-white font-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0_0_#f4f4f5]',
  textMuted: 'text-zinc-300',
  text: 'text-white',
  border: 'border-white',
  surface: 'bg-zinc-900',
  blobPrimary: 'bg-fuchsia-500/20',
  blobSecondary: 'bg-cyan-400/20',
  blobTertiary: 'bg-yellow-300/15',
  activeNav: 'bg-yellow-300 text-black',
  inactiveNav: 'hover:bg-white/10 text-zinc-200',
}

type ThemeContextValue = {
  colorMode: 'light' | 'dark'
  toggleColorMode: () => void
  theme: Theme
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('specter-color-mode')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    window.localStorage.setItem('specter-color-mode', colorMode)
  }, [colorMode])

  function toggleColorMode() {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const isDark = colorMode === 'dark'
  const theme = isDark ? dark : light

  return (
    <ThemeContext.Provider value={{ colorMode, toggleColorMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
