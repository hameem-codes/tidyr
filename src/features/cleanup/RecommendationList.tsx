import { RecommendationRow } from './RecommendationRow'
import type { RecommendationItem } from '../../types/scan'
import { formatGB } from '../../lib/format'
import { ShieldCheck, AlertCircle } from 'lucide-react'

interface RecommendationListProps {
  items: RecommendationItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

export function RecommendationList({
  items,
  selectedIds,
  onToggle,
}: RecommendationListProps) {
  const safe = items.filter(i => i.tier === 'safe')
  const review = items.filter(i => i.tier === 'review')

  const renderGroup = (
    title: string,
    groupItems: RecommendationItem[],
    toneClass: string,
    icon: React.ReactNode,
    subtitle: string
  ) => {
    if (!groupItems.length) return null
    const groupTotal = groupItems.reduce((n, i) => n + i.size, 0)

    return (
      <section className="rec-group" aria-label={title}>
        <div className="group-heading">
          <div className="group-heading-title">
            <span className={`group-icon ${toneClass}`} aria-hidden="true">
              {icon}
            </span>
            <div>
              <h2>{title}</h2>
              <small className="muted">{subtitle}</small>
            </div>
          </div>
          <span className={`group-total ${toneClass}`}>
            {formatGB(groupTotal)}
          </span>
        </div>

        <div className="rec-rows">
          {groupItems.map(item => (
            <RecommendationRow
              key={item.id}
              item={item}
              checked={selectedIds.includes(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="recommendations">
      {renderGroup(
        'Safe to remove',
        safe,
        'safe-text',
        <ShieldCheck size={18} />,
        'Generated build outputs, temporary caches, and expendable logs'
      )}
      {renderGroup(
        'Review before removing',
        review,
        'review-text',
        <AlertCircle size={18} />,
        'Local AI weights, SDK components, or inactive dependencies'
      )}
    </div>
  )
}
