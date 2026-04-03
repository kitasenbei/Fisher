import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const typeStyles = {
  info: 'border-[#2d8ceb]',
  success: 'border-[#55b855]',
  warning: 'border-[#cc8833]',
  error: 'border-[#e05555]',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-1.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-[#2b2b2b] border-l-2 ${typeStyles[t.type]} px-2.5 py-1.5 rounded-[3px] text-[11px] text-[#cccccc] shadow-lg shadow-black/40 cursor-default`}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
