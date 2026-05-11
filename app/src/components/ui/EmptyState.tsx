import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  message: string
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  const { theme } = useTheme()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center gap-3">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className={`w-14 h-14 rounded-full border-2 ${theme.border} bg-yellow-200 flex items-center justify-center`}
      >
        {icon}
      </motion.div>
      <p className={`${theme.textMuted} font-semibold text-sm max-w-[200px]`}>{message}</p>
    </div>
  )
}
