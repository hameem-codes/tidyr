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
