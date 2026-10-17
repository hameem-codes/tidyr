import { create } from 'zustand'

interface SettingsState {
  theme: 'light' | 'dark'
  scanFolder: string
  idleDays: number
  moveToTrash: boolean
  setTheme: (theme: 'light' | 'dark') => void
  setScanFolder: (value: string) => void
  setIdleDays: (value: number) => void
  setMoveToTrash: (value: boolean) => void
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tidyr-theme')
    if (saved === 'light' || saved === 'dark') return saved
  }
  return 'dark'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  scanFolder: '~',
  idleDays: 30,
  moveToTrash: false,
  setTheme: theme => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tidyr-theme', theme)
    }
    set({ theme })
  },
  setScanFolder: scanFolder => set({ scanFolder }),
  setIdleDays: idleDays => set({ idleDays }),
  setMoveToTrash: moveToTrash => set({ moveToTrash }),
}))

