import { useEffect, useState, useMemo } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { useScanStore } from '../store/scanStore'
import { useSelectionStore } from '../store/selectionStore'
import { useToastStore } from '../store/toastStore'
import { LoadingState, ErrorState, EmptyState } from '../components/States'
import { RecommendationList } from '../features/cleanup/RecommendationList'
import { SelectionBar } from '../features/cleanup/SelectionBar'
import { ScriptDrawer } from '../features/cleanup/ScriptDrawer'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatGB } from '../lib/format'
import { buildScript } from '../lib/script'

type SortMode = 'size-desc' | 'size-asc' | 'label'

export default function Cleanup() {
  const { data, status, error } = useScanStore()
  const selectedIds = useSelectionStore(s => s.selectedIds)
  const syncDefaults = useSelectionStore(s => s.syncDefaults)
  const toggle = useSelectionStore(s => s.toggle)
  const selectSafe = useSelectionStore(s => s.selectSafe)
  const clear = useSelectionStore(s => s.clear)
  const showToast = useToastStore(s => s.show)

  const [drawer, setDrawer] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'safe' | 'review'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('size-desc')

  useEffect(() => {
    if (data) syncDefaults(data.items)
  }, [data, syncDefaults])

  const visible = useMemo(() => {
    if (!data) return []
    let items = data.items.filter(
      item =>
        (filter === 'all' || item.tier === filter) &&
        (item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.paths.some(path => path.toLowerCase().includes(query.toLowerCase())) ||
          item.note.toLowerCase().includes(query.toLowerCase()))
    )

    if (sortMode === 'size-desc') {
      items = [...items].sort((a, b) => b.size - a.size)
    } else if (sortMode === 'size-asc') {
      items = [...items].sort((a, b) => a.size - b.size)
    } else if (sortMode === 'label') {
      items = [...items].sort((a, b) => a.label.localeCompare(b.label))
    }

    return items
  }, [data, filter, query, sortMode])

  if (status === 'loading' && !data) return <LoadingState />
  if (status === 'error' && !data) return <ErrorState message={error || 'Unknown scan error.'} />
  if (!data) return <EmptyState />

  const selected = data.items.filter(item => selectedIds.includes(item.id))
  const total = selected.reduce((n, i) => n + i.size, 0)

  const handleCopyScript = async () => {
    try {
      const script = buildScript(selected)
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
          {(['all', 'safe', 'review'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={filter === tab}
              className={filter === tab ? 'active' : ''}
              onClick={() => setFilter(tab)}
            >
              {tab === 'all' ? 'All items' : tab === 'safe' ? 'Safe to clear' : 'Needs review'}
              <span>
                {tab === 'all'
                  ? data.items.length
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
          onCopy={() => setConfirm(true)}
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
