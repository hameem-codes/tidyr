import type { RecommendationItem } from '../types/scan'

export type FilterTab = 'all' | 'safe' | 'review' | 'idle'
export type SortMode = 'size-desc' | 'size-asc' | 'label'

export interface FilterItemsOptions {
  filter?: FilterTab
  idleDays?: number
  query?: string
  sortMode?: SortMode
}

export function isItemIdleEligible(item: RecommendationItem, idleDays: number): boolean {
  if (item.daysIdle !== undefined) {
    return item.daysIdle >= idleDays
  }
  if (item.lastModified) {
    const ms = typeof item.lastModified === 'number' ? item.lastModified : new Date(item.lastModified).getTime()
    if (!isNaN(ms)) {
      const days = Math.max(0, Math.floor((Date.now() - ms) / 86400000))
      return days >= idleDays
    }
  }
  return true
}

export function isIdleProjectItem(item: RecommendationItem): boolean {
  if (item.daysIdle !== undefined || item.lastModified !== undefined) return true
  if (item.id.includes('node-modules') || item.id.includes('next-output')) return true
  return item.paths.some(p => p.includes('node_modules') || p.includes('.next') || p.includes('.turbo'))
}

export function filterItems(
  items: RecommendationItem[],
  options: FilterItemsOptions = {}
): RecommendationItem[] {
  const {
    filter = 'all',
    idleDays = 90,
    query = '',
    sortMode = 'size-desc',
  } = options

  const q = (query || '').toLowerCase()

  let result = items.filter(item => {
    if (filter === 'idle') {
      if (!isIdleProjectItem(item) || !isItemIdleEligible(item, idleDays)) return false
    } else if (filter === 'safe') {
      if (item.tier !== 'safe') return false
    } else if (filter === 'review') {
      if (item.tier !== 'review') return false
    }

    if (!q) return true

    return (
      item.label.toLowerCase().includes(q) ||
      item.paths.some(path => path.toLowerCase().includes(q)) ||
      item.note.toLowerCase().includes(q)
    )
  })

  if (sortMode === 'size-desc') {
    result = [...result].sort((a, b) => b.size - a.size)
  } else if (sortMode === 'size-asc') {
    result = [...result].sort((a, b) => a.size - b.size)
  } else if (sortMode === 'label') {
    result = [...result].sort((a, b) => a.label.localeCompare(b.label))
  }

  return result
}
