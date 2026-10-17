export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${units[i]}`
}
export function formatGB(bytes: number, decimals = 1) { return `${(bytes / 1_000_000_000).toFixed(decimals)} GB` }
export function formatCompactGB(bytes: number) { return `${(bytes / 1_000_000_000).toFixed(bytes < 10_000_000_000 ? 1 : 0)} GB` }
export function homePath(path: string) { return path === '~' ? '~' : path.replace(/^~\//, '~/') }
export function pathTail(path: string) { return path.split('/').filter(Boolean).pop() || '~' }

export function formatRelativeTime(dateInput: string | Date | number): string {
  if (!dateInput) return 'never'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  if (isNaN(date.getTime())) {
    return String(dateInput)
  }
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'just now'
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 45) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hour ago'
  if (diffHr < 24) return `${diffHr} hours ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}
