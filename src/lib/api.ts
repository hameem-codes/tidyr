import type { ScanData } from '../types/scan'

export async function loadScan(): Promise<ScanData> {
  const response = await fetch('/scan.json', { cache: 'no-store' })
  if (!response.ok) throw new Error(`scan.json returned ${response.status}`)
  return response.json() as Promise<ScanData>
}
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
    return res.ok
  } catch {
    return false
  }
}

export async function revealPath(path: string): Promise<boolean> {
  try {
    const res = await fetch('/api/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    return res.ok
  } catch {
    return false
  }
}

