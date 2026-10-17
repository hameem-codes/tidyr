import { create } from 'zustand'
import {
  loadSampleScan,
  simulateScan,
  checkServerConnected,
  triggerServerScan,
  fetchServerStatus,
  fetchServerResult,
} from '../lib/api'
import type { ScanData, ScanStatus } from '../types/scan'

interface ScanState {
  data: ScanData | null
  status: ScanStatus
  progress: number
  folders: number
  error: string | null
  serverConnected: boolean
  isDemo: boolean
  load: () => Promise<void>
  scan: (folder?: string) => Promise<void>
  setData: (data: ScanData, isDemo?: boolean) => void
}

export const useScanStore = create<ScanState>((set) => ({
  data: null,
  status: 'idle',
  progress: 0,
  folders: 84210,
  error: null,
  serverConnected: false,
  isDemo: true,
  setData: (data, isDemo = false) => set({ data, isDemo, status: 'ready', progress: 100 }),
  load: async () => {
    set({ status: 'loading', error: null })
    try {
      const serverConnected = await checkServerConnected()
      if (serverConnected) {
        const result = await fetchServerResult()
        if (result) {
          set({ data: result, status: 'ready', progress: 100, serverConnected: true, isDemo: false })
          return
        }
      }
      const data = await loadSampleScan()
      set({ data, status: 'ready', progress: 100, serverConnected, isDemo: true })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unable to load scan.' })
    }
  },
  scan: async (folder?: string) => {
    set({ status: 'loading', progress: 0, folders: 0, error: null })
    const isConnected = await checkServerConnected()
    if (isConnected) {
      const started = await triggerServerScan(folder)
      if (started) {
        try {
          const pollResult = await new Promise<ScanData>((resolve, reject) => {
            const check = async () => {
              const statusData = await fetchServerStatus()
              if (!statusData) {
                reject(new Error('Connection lost to scanning server'))
                return
              }
              if (statusData.status === 'scanning') {
                set({
                  folders: statusData.folderCount,
                  progress: Math.min(95, Math.round(statusData.folderCount / 50)),
                })
                window.setTimeout(check, 200)
              } else if (statusData.status === 'ready') {
                const res = await fetchServerResult()
                if (res) resolve(res)
                else reject(new Error('Failed to retrieve scan result'))
              } else if (statusData.status === 'error') {
                reject(new Error(statusData.error || 'Scan error'))
              } else {
                window.setTimeout(check, 200)
              }
            }
            check()
          })

          set({
            data: pollResult,
            status: 'ready',
            progress: 100,
            serverConnected: true,
            isDemo: false,
          })
          return
        } catch (err) {
          console.warn('Live scan error, falling back to sample:', err)
        }
      }
    }

    // Fallback to sample scan.json
    set({ folders: 84210, progress: 0 })
    await simulateScan((progress, folders) => set({ progress, folders }))
    try {
      const data = await loadSampleScan()
      set({
        data: { ...data, scannedAt: new Date().toISOString() },
        status: 'ready',
        progress: 100,
        serverConnected: false,
        isDemo: true,
      })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unable to refresh scan.' })
    }
  },
}))
