import { ExternalLink, Plus, Check } from 'lucide-react'
import { formatGB } from '../../lib/format'
import type { FolderNode, RecommendationItem } from '../../types/scan'
import { SafetyBadge } from '../../components/SafetyBadge'
import { useToastStore } from '../../store/toastStore'
import { useSelectionStore } from '../../store/selectionStore'

interface FolderDetailProps {
  node: FolderNode | null
  item?: RecommendationItem
  onAdd: () => void
}

export function FolderDetail({ node, item, onAdd }: FolderDetailProps) {
  const showToast = useToastStore(s => s.show)
  const selectedIds = useSelectionStore(s => s.selectedIds)
  const isSelected = item ? selectedIds.includes(item.id) : false

  const handleOpenInFinder = async () => {
    if (!node) return
    try {
      await navigator.clipboard?.writeText(node.path)
      showToast(`Copied ${node.path} to clipboard (Finder reveal)`)
    } catch {
      showToast(`Selected: ${node.path}`)
    }
  }

  const handleToggleCleanup = () => {
    if (!item) return
    onAdd()
    showToast(isSelected ? `Removed ${item.label} from cleanup selection` : `Added ${item.label} to cleanup selection`)
  }

  if (!node) {
    return (
      <aside className="detail-panel empty-detail">
        <span className="eyebrow">Folder details</span>
        <h3>Choose a tile</h3>
        <p className="muted">
          Click any area of the map to inspect its storage footprint, system role, and cleanup safety status.
        </p>
      </aside>
    )
  }

  return (
    <aside className="detail-panel">
      <div className="eyebrow">Folder details</div>
      <h2>{node.name}</h2>

      <dl>
        <div>
          <dt>Full path</dt>
          <dd>
            <code>{node.path}</code>
          </dd>
        </div>

        <div>
          <dt>Disk footprint</dt>
          <dd className="detail-size">{formatGB(node.size)}</dd>
        </div>

        <div>
          <dt>Category</dt>
          <dd>
            <span className="category-pill">{node.category}</span>
          </dd>
        </div>

        {item && (
          <div>
            <dt>Cleanup safety</dt>
            <dd>
              <div className="detail-safety-row">
                <SafetyBadge tier={item.tier} />
              </div>
              <p className="detail-note">{item.note}</p>
            </dd>
          </div>
        )}
      </dl>

      <div className="detail-actions">
        <button
          type="button"
          className="button ghost"
          onClick={handleOpenInFinder}
          title="Copy path and simulate Finder reveal"
        >
          <ExternalLink size={15} />
          Reveal in Finder
        </button>

        {item && (
          <button
            type="button"
            className={`button ${isSelected ? 'outline' : 'primary'}`}
            onClick={handleToggleCleanup}
          >
            {isSelected ? (
              <>
                <Check size={15} />
                Selected for cleanup
              </>
            ) : (
              <>
                <Plus size={15} />
                Add to cleanup list
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
