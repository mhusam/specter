import { useTheme } from '../../contexts/ThemeContext'
import type { ReactNode } from 'react'

type PanelProps = {
  children: ReactNode
  alt?: boolean
  className?: string
}

export function Panel({ children, alt = false, className = '' }: PanelProps) {
  const { theme } = useTheme()
  const panelClass = alt ? theme.panelAlt : theme.panel
  return (
    <div className={`${panelClass} ${className}`}>
      {children}
    </div>
  )
}
