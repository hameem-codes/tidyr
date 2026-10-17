import { Eye, RotateCcw, CheckCheck } from 'lucide-react'
import { formatSize } from '../../lib/format'

interface SelectionBarProps {
  total: number
  count: number
  onSafe: () => void
  onClear: () => void
  onScript: () => void
}

export function SelectionBar({
  total,
  count,
  onSafe,
  onClear,
  onScript,
}: SelectionBarProps) {
  return (
    <aside className="selection-bar" aria-label="Cleanup selection controls">
      <div className="selection-summary">
        <strong>{formatSize(total)}</strong>
        <span className="selection-meta">
          selected · {count} {count === 1 ? 'directory' : 'directories'}
        </span>
      </div>

      <div className="selection-actions">
        <button
          type="button"
          className="text-button"
          onClick={onSafe}
          title="Select all verified safe cleanup recommendations"
        >
          <CheckCheck size={14} />
          Select safe only
        </button>

        <button
          type="button"
          className="text-button"
          onClick={onClear}
          disabled={count === 0}
          title="Clear all selections"
        >
          <RotateCcw size={14} />
          Reset
        </button>

        <button
          type="button"
          className="button primary"
          onClick={onScript}
          disabled={count === 0}
        >
          <Eye size={15} />
          Review script ({count})
        </button>
      </div>
    </aside>
  )
}
