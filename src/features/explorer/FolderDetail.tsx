import { ExternalLink, Plus, Check, Copy } from 'lucide-react'
import { formatSize } from '../../lib/format'
import type { FolderNode, RecommendationItem } from '../../types/scan'
import { SafetyBadge } from '../../components/SafetyBadge'
import { useToastStore } from '../../store/toastStore'
import { useSelectionStore } from '../../store/selectionStore'
import { useScanStore } from '../../store/scanStore'
import { revealPath } from '../../lib/api'

interface FolderDetailProps {
  node: FolderNode | null
  item?: RecommendationItem
  onAdd: () => void
}

export function FolderDetail({ node, item, onAdd }: FolderDetailProps) {
  const showToast = useToastStore(s => s.show)
  const selectedIds = useSelectionStore(s => s.selectedIds)
  const serverConnected = useScanStore(s => s.serverConnected)
  const isSelected = item ? selectedIds.includes(item.id) : false

  const handleRevealOrCopy = async () => {
    if (!node) return
    if (serverConnected) {
      try {
        const ok = await revealPath(node.path)
        if (ok) {
          showToast(`Revealed ${node.path} in file manager`)
          return
        }
      } catch {
        // Fall back to clipboard
      }
    }
    try {
      await navigator.clipboard?.writeText(node.path)
      showToast(`Copied ${node.path} to clipboard`)
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
          <dd className="detail-size">{formatSize(node.size)}</dd>
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
          onClick={handleRevealOrCopy}
          title={serverConnected ? 'Reveal folder in file manager' : 'Copy folder path to clipboard'}
        >
          {serverConnected ? <ExternalLink size={15} /> : <Copy size={15} />}
          {serverConnected ? 'Reveal in Finder' : 'Copy path'}
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
