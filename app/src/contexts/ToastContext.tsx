import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastStyles: Record<ToastType, string> = {
  success: 'bg-lime-300 text-black border-2 border-black shadow-[3px_3px_0_0_#000]',
  error: 'bg-red-400 text-black border-2 border-black shadow-[3px_3px_0_0_#000]',
  info: 'bg-sky-300 text-black border-2 border-black shadow-[3px_3px_0_0_#000]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const success = useCallback((message: string) => addToast('success', message), [addToast])
  const error = useCallback((message: string) => addToast('error', message), [addToast])
  const info = useCallback((message: string) => addToast('info', message), [addToast])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-3 min-w-[240px] max-w-sm font-semibold text-sm ${toastStyles[toast.type]}`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-black"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
