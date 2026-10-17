import { ChevronRight, Home } from 'lucide-react'
import type { FolderNode } from '../../types/scan'

interface BreadcrumbProps {
  nodes: FolderNode[]
  onSelect: (index: number) => void
}

export function Breadcrumb({ nodes, onSelect }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Folder breadcrumbs">
      {nodes.map((node, index) => {
        const isRoot = index === 0
        const isLast = index === nodes.length - 1

        return (
          <span key={node.id} className="breadcrumb-segment">
            <button
              type="button"
              className={`breadcrumb-btn ${isLast ? 'active' : ''}`}
              onClick={() => onSelect(index)}
              title={`Jump to ${node.path}`}
            >
              {isRoot && <Home size={13} className="breadcrumb-root-icon" />}
              <span>{node.name}</span>
            </button>

            {!isLast && (
              <ChevronRight size={13} className="breadcrumb-separator" aria-hidden="true" />
            )}
          </span>
        )
      })}
    </nav>
  )
}
