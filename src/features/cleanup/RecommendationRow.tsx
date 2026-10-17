import { Check } from 'lucide-react'
import { formatGB } from '../../lib/format'
import { SafetyBadge } from '../../components/SafetyBadge'
import type { RecommendationItem } from '../../types/scan'

interface RecommendationRowProps {
  item: RecommendationItem
  checked: boolean
  onToggle: () => void
}

export function RecommendationRow({ item, checked, onToggle }: RecommendationRowProps) {
  return (
    <label
      className={`recommendation-row ${checked ? 'checked' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${item.label} (${formatGB(item.size)})`}
      />

      <span className="fake-check" aria-hidden="true">
        {checked && <Check size={13} />}
      </span>

      <span className="rec-copy">
        <span className="rec-top-line">
          <strong>{item.label}</strong>
          <span className="rec-paths" title={item.paths.join('\n')}>
            <code>{item.paths.join(' · ')}</code>
          </span>
        </span>
        <small className="rec-note">{item.note}</small>
      </span>

      <span className="rec-size">{formatGB(item.size)}</span>
      <SafetyBadge tier={item.tier} />
    </label>
  )
}
