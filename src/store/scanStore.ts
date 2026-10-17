import { create } from 'zustand'
import { loadScan, simulateScan } from '../lib/api'
import type { ScanData, ScanStatus } from '../types/scan'

interface ScanState { data: ScanData | null; status: ScanStatus; progress: number; folders: number; error: string | null; load: () => Promise<void>; scan: () => Promise<void> }
export const useScanStore = create<ScanState>((set) => ({
  data: null, status: 'idle', progress: 0, folders: 84210, error: null,
  load: async () => { set({ status: 'loading', error: null }); try { const data = await loadScan(); set({ data, status: 'ready', progress: 100 }) } catch (error) { set({ status: 'error', error: error instanceof Error ? error.message : 'Unable to load scan.' }) } },
  scan: async () => { set({ status: 'loading', progress: 0, folders: 84210 }); await simulateScan((progress, folders) => set({ progress, folders })); try { const data = await loadScan(); set({ data: { ...data, scannedAt: new Date().toISOString() }, status: 'ready', progress: 100 }) } catch (error) { set({ status: 'error', error: error instanceof Error ? error.message : 'Unable to refresh scan.' }) } },
}))
