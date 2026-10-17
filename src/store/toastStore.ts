import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string, durationMs?: number) => void
  hide: () => void
}

let timeoutId: number | undefined

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message: string, durationMs = 3000) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    set({ message })
    timeoutId = window.setTimeout(() => {
      set({ message: null })
    }, durationMs)
  },
  hide: () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    set({ message: null })
  },
}))
