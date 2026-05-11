import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { theme } = useTheme()

  return (
    <div className={`h-screen overflow-hidden ${theme.bg} p-4 md:p-6 transition-all duration-500 relative`}>
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className={`absolute -top-20 -left-24 w-80 h-80 rounded-full blur-3xl ${theme.blobPrimary}`}
          animate={{ x: [0, 50, 0], y: [0, 35, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute top-1/3 -right-28 w-96 h-96 rounded-full blur-3xl ${theme.blobSecondary}`}
          animate={{ x: [0, -55, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute -bottom-28 left-1/3 w-72 h-72 rounded-full blur-3xl ${theme.blobTertiary}`}
          animate={{ x: [0, -30, 0], y: [0, -45, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Main shell grid — fills viewport, no horizontal overflow */}
      <div className={`grid grid-cols-[84px_1fr] h-full overflow-hidden ${theme.shell}`}>
        {children}
      </div>
    </div>
  )
}
