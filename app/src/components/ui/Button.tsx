import { useTheme } from '../../contexts/ThemeContext'
import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const { theme } = useTheme()

  const variantClass =
    variant === 'primary'
      ? theme.buttonPrimary
      : variant === 'danger'
        ? theme.buttonDanger
        : theme.buttonGhost

  return (
    <button
      className={`px-3 py-2 rounded-none transition-transform focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
