import * as React from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastState {
  toasts: Toast[]
}

const toastState: ToastState = {
  toasts: []
}

let listeners: Array<(state: ToastState) => void> = []

function dispatch(action: { type: "ADD_TOAST" | "REMOVE_TOAST"; toast?: Toast; id?: string }) {
  switch (action.type) {
    case "ADD_TOAST":
      if (action.toast) {
        toastState.toasts = [...toastState.toasts, action.toast]
      }
      break
    case "REMOVE_TOAST":
      if (action.id) {
        toastState.toasts = toastState.toasts.filter(t => t.id !== action.id)
      }
      break
  }
  
  listeners.forEach(listener => {
    listener(toastState)
  })
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(toastState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      listeners = listeners.filter(l => l !== setState)
    }
  }, []) // Remove state dependency to prevent re-registering listeners

  // Memoize the toast function to ensure stable reference
  const toast = React.useCallback(({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = String(Date.now())
    const toast: Toast = { id, title: title || '', description: description || '', variant }
    
    dispatch({ type: "ADD_TOAST", toast })
    
    setTimeout(() => {
      dispatch({ type: "REMOVE_TOAST", id })
    }, 5000)
  }, [])

  // Memoize the dismiss function to ensure stable reference
  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id })
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss
  }
}
