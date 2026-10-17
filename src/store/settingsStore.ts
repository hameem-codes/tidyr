import { create } from 'zustand'
import type { Platform } from '../lib/script'

interface SettingsState {
  theme: 'light' | 'dark'
  scanFolder: string
  idleDays: number
  moveToTrash: boolean
  platform: Platform
  setTheme: (theme: 'light' | 'dark') => void
  setScanFolder: (value: string) => void
  setIdleDays: (value: number) => void
  setMoveToTrash: (value: boolean) => void
  setPlatform: (value: Platform) => void
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tidyr-theme')
    if (saved === 'light' || saved === 'dark') return saved
  }
  return 'dark'
}

const getDefaultPlatform = (): Platform => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || ''
    const plat = (navigator as unknown as { platform?: string }).platform || ''
    const saved = localStorage.getItem('tidyr-platform') as Platform
    if (saved === 'darwin' || saved === 'linux' || saved === 'other') return saved
    if (/Mac|iPhone|iPad|iPod/i.test(plat) || /Macintosh|Mac OS X/i.test(ua)) {
      return 'darwin'
    }
    if (/Linux/i.test(plat) || /Linux/i.test(ua)) {
      return 'linux'
    }
  }
  return 'darwin'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  scanFolder: '~',
  idleDays: 30,
  moveToTrash: false,
  platform: getDefaultPlatform(),
  setTheme: theme => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tidyr-theme', theme)
    }
    set({ theme })
  },
  setScanFolder: scanFolder => set({ scanFolder }),
  setIdleDays: idleDays => set({ idleDays }),
  setMoveToTrash: moveToTrash => set({ moveToTrash }),
  setPlatform: platform => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tidyr-platform', platform)
    }
    set({ platform })
  },
}))

