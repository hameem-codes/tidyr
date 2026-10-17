import type { ScanData } from '../types/scan'

export async function loadSampleScan(): Promise<ScanData> {
  const meta = import.meta as unknown as { env?: { BASE_URL?: string } }
  const base = meta.env?.BASE_URL || '/'
  const url = base.endsWith('/') ? `${base}scan.json` : `${base}/scan.json`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`scan.json returned ${response.status}`)
  const ct = response.headers.get('content-type') || ''
  if (ct && !ct.includes('application/json') && !ct.includes('text/plain') && !ct.includes('octet-stream')) {
    throw new Error('Failed to load scan.json (received non-JSON response)')
  }
  const data = await response.json()
  return data as ScanData
}

export const loadScan = loadSampleScan

export function simulateScan(onProgress: (value: number, folders: number) => void) {
  return new Promise<void>((resolve) => {
    let progress = 0
    let folders = 84210
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 17)
      folders += Math.round(2100 * Math.random())
      onProgress(progress, folders)
      if (progress >= 100) { window.clearInterval(timer); window.setTimeout(resolve, 260) }
    }, 180)
  })
}

export async function checkServerConnected(): Promise<boolean> {
  try {
    const res = await fetch('/api/scan/status', { method: 'GET', cache: 'no-store' })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return false
    const data = await res.json()
    return Boolean(data && typeof data === 'object' && 'status' in data)
  } catch {
    return false
  }
}

export interface ServerScanStatus {
  status: 'idle' | 'scanning' | 'ready' | 'error'
  folderCount: number
  currentFolder?: string
  error?: string | null
}

export async function fetchServerStatus(): Promise<ServerScanStatus | null> {
  try {
    const res = await fetch('/api/scan/status', { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    const data = await res.json()
    return data as ServerScanStatus
  } catch {
    return null
  }
}

export async function triggerServerScan(folder?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folder || '~' }),
    })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json')
  } catch {
    return false
  }
}

export async function fetchServerResult(): Promise<ScanData | null> {
  try {
    const res = await fetch('/api/scan/result', { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    const data = await res.json()
    return data as ScanData
  } catch {
    return null
  }
}

export async function revealPath(path: string): Promise<boolean> {
  try {
    const res = await fetch('/api/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json')
  } catch {
    return false
  }
}

