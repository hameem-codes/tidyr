import { create } from 'zustand'
import type { Platform } from '../lib/script'

export type ThemeSetting = 'light' | 'dark' | 'system'

export function resolveTheme(theme: ThemeSetting): 'light' | 'dark' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

interface SettingsState {
  theme: ThemeSetting
  resolvedTheme: 'light' | 'dark'
  scanFolder: string
  idleDays: number
  moveToTrash: boolean
  platform: Platform
  setTheme: (theme: ThemeSetting) => void
  syncResolvedTheme: () => void
  setScanFolder: (value: string) => void
  setIdleDays: (value: number) => void
  setMoveToTrash: (value: boolean) => void
  setPlatform: (value: Platform) => void
}

const getInitialTheme = (): ThemeSetting => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tidyr-theme') as ThemeSetting
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  }
  return 'system'
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

const getInitialIdleDays = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tidyr-idle-days')
    if (saved && !isNaN(Number(saved))) return Number(saved)
  }
  return 90
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initialTheme = getInitialTheme()
  return {
    theme: initialTheme,
    resolvedTheme: resolveTheme(initialTheme),
    scanFolder: '~',
    idleDays: getInitialIdleDays(),
    moveToTrash: false,
    platform: getDefaultPlatform(),
    setTheme: theme => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tidyr-theme', theme)
      }
      set({ theme, resolvedTheme: resolveTheme(theme) })
    },
    syncResolvedTheme: () => {
      const current = get().theme
      const nextResolved = resolveTheme(current)
      if (get().resolvedTheme !== nextResolved) {
        set({ resolvedTheme: nextResolved })
      }
    },
  setScanFolder: scanFolder => set({ scanFolder }),
  setIdleDays: idleDays => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tidyr-idle-days', String(idleDays))
    }
    set({ idleDays })
  },
  setMoveToTrash: moveToTrash => set({ moveToTrash }),
  setPlatform: platform => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tidyr-platform', platform)
    }
    set({ platform })
  },
}
})

