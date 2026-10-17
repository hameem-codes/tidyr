import { useEffect, useState, useMemo } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { useScanStore } from '../store/scanStore'
import { useSelectionStore } from '../store/selectionStore'
import { useToastStore } from '../store/toastStore'
import { useSettingsStore } from '../store/settingsStore'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { RecommendationList } from '../features/cleanup/RecommendationList'
import { SelectionBar } from '../features/cleanup/SelectionBar'
import { ScriptDrawer } from '../features/cleanup/ScriptDrawer'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatGB } from '../lib/format'
import { buildScript } from '../lib/script'
import type { RecommendationItem } from '../types/scan'

type SortMode = 'size-desc' | 'size-asc' | 'label'
type FilterTab = 'all' | 'safe' | 'review' | 'idle'

function isItemIdleEligible(item: RecommendationItem, idleDays: number): boolean {
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

function isIdleProjectItem(item: RecommendationItem): boolean {
  if (item.daysIdle !== undefined || item.lastModified !== undefined) return true
  if (item.id.includes('node-modules') || item.id.includes('next-output')) return true
  return item.paths.some(p => p.includes('node_modules') || p.includes('.next') || p.includes('.turbo'))
}

export default function Cleanup() {
  const { data, status, error } = useScanStore()
  const idleDays = useSettingsStore(s => s.idleDays)
  const selectedIds = useSelectionStore(s => s.selectedIds)
  const syncDefaults = useSelectionStore(s => s.syncDefaults)
  const toggle = useSelectionStore(s => s.toggle)
  const selectSafe = useSelectionStore(s => s.selectSafe)
  const clear = useSelectionStore(s => s.clear)
  const showToast = useToastStore(s => s.show)

  const [drawer, setDrawer] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [scriptToCopy, setScriptToCopy] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sortMode, setSortMode] = useState<SortMode>('size-desc')

  useEffect(() => {
    if (data) syncDefaults(data.items)
  }, [data, syncDefaults])

  const visible = useMemo(() => {
    if (!data) return []
    const q = query.toLowerCase()
    let items = data.items.filter(item => {
      if (filter === 'idle') {
        if (!isIdleProjectItem(item) || !isItemIdleEligible(item, idleDays)) return false
      } else if (filter === 'safe') {
        if (item.tier !== 'safe') return false
      } else if (filter === 'review') {
        if (item.tier !== 'review') return false
      }

      return (
        item.label.toLowerCase().includes(q) ||
        item.paths.some(path => path.toLowerCase().includes(q)) ||
        item.note.toLowerCase().includes(q)
      )
    })

    if (sortMode === 'size-desc') {
      items = [...items].sort((a, b) => b.size - a.size)
    } else if (sortMode === 'size-asc') {
      items = [...items].sort((a, b) => a.size - b.size)
    } else if (sortMode === 'label') {
      items = [...items].sort((a, b) => a.label.localeCompare(b.label))
    }

    return items
  }, [data, filter, query, sortMode, idleDays])

  if (status === 'loading' && !data) return <LoadingState />
  if (status === 'error' && !data) return <ErrorState message={error || 'Unknown scan error.'} />
  if (!data) return <EmptyState />

  const selected = data.items.filter(item => selectedIds.includes(item.id))
  const total = selected.reduce((n, i) => n + i.size, 0)

  const handleCopyScript = async () => {
    try {
      const script = scriptToCopy || buildScript(selected)
      await navigator.clipboard?.writeText(script)
      showToast('Cleanup script copied to clipboard')
    } catch {
      showToast('Script generated (clipboard unavailable)')
    }
    setConfirm(false)
  }

  const cycleSort = () => {
    if (sortMode === 'size-desc') {
      setSortMode('size-asc')
      showToast('Sorting by size: Smallest first')
    } else if (sortMode === 'size-asc') {
      setSortMode('label')
      showToast('Sorting by name: A to Z')
    } else {
      setSortMode('size-desc')
      showToast('Sorting by size: Largest first')
    }
  }

  return (
    <div className="page cleanup-page">
      <div className="page-intro compact">
        <div>
          <span className="eyebrow">Deterministic cleanup</span>
          <h1>Cleanup recommendations</h1>
          <p className="lede">
            Safe cache suggestions are pre-selected. Review all paths before copying your script.
          </p>
        </div>
      </div>

      <div className="cleanup-toolbar">
        <div className="filter-tabs" role="tablist">
          {(['all', 'safe', 'review', 'idle'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={filter === tab}
              className={filter === tab ? 'active' : ''}
              onClick={() => setFilter(tab)}
            >
              {tab === 'all'
                ? 'All items'
                : tab === 'safe'
                  ? 'Safe to clear'
                  : tab === 'review'
                    ? 'Needs review'
                    : 'Idle projects'}
              <span>
                {tab === 'all'
                  ? data.items.length
                  : tab === 'idle'
                    ? data.items.filter(i => isIdleProjectItem(i) && isItemIdleEligible(i, idleDays)).length
                    : data.items.filter(i => i.tier === tab).length}
              </span>
            </button>
          ))}
        </div>

        <label className="search-field">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search paths or labels…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="button outline sort-toggle-button"
          onClick={cycleSort}
          title="Change sort order"
        >
          <ArrowUpDown size={14} />
          <span className="sort-label">
            {sortMode === 'size-desc' ? 'Largest first' : sortMode === 'size-asc' ? 'Smallest first' : 'Alphabetical'}
          </span>
        </button>
      </div>

      <div className="cleanup-layout">
        <div className="cleanup-list">
          {visible.length ? (
            <RecommendationList
              items={visible}
              selectedIds={selectedIds}
              onToggle={toggle}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="cleanup-aside">
          <div className="aside-stamp">
            <span className="stamp-status">
              {selected.length ? 'Ready to generate' : 'Nothing selected'}
            </span>
            <strong>{formatGB(total)}</strong>
            <span>{selected.length} items targeted in script</span>
          </div>

          <div className="aside-guidance">
            <h4>How this works</h4>
            <p className="muted small">
              Tidyr generates an immutable POSIX shell script. It never alters or deletes files on its own, uses no <code>sudo</code>, and checks all paths against your home folder.
            </p>
          </div>
        </div>
      </div>

      <SelectionBar
        total={total}
        count={selected.length}
        onSafe={() => {
          selectSafe(data.items)
          showToast('Selected all safe cleanup items')
        }}
        onClear={() => {
          clear()
          showToast('Cleared cleanup selection')
        }}
        onScript={() => setDrawer(true)}
      />

      {drawer && (
        <ScriptDrawer
          items={selected}
          onClose={() => setDrawer(false)}
          onCopy={script => {
            setScriptToCopy(script)
            setConfirm(true)
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          onCancel={() => setConfirm(false)}
          onConfirm={handleCopyScript}
        />
      )}
    </div>
  )
}
