import { useMemo } from 'react'
import { useScanStore } from '../../store/scanStore'
import { useSelectionStore } from '../../store/selectionStore'
import { formatGB } from '../../lib/format'
import { ShieldCheck, AlertCircle, HardDrive, Sparkles } from 'lucide-react'

export function SummaryBar() {
  const data = useScanStore(s => s.data)!
  const selectedIds = useSelectionStore(s => s.selectedIds)

  const selected = useMemo(
    () => data.items.filter(item => selectedIds.includes(item.id)),
    [data.items, selectedIds]
  )

  const safe = data.items
    .filter(i => i.tier === 'safe')
    .reduce((n, i) => n + i.size, 0)

  const review = data.items
    .filter(i => i.tier === 'review')
    .reduce((n, i) => n + i.size, 0)

  const selectedTotal = selected.reduce((n, i) => n + i.size, 0)
  const after = data.baseFreeBytes + selectedTotal
  const percentGain =
    data.scannedBytes > 0
      ? Math.min(100, Math.round((after / data.scannedBytes) * 100))
      : 0

  return (
    <section className="summary-grid" aria-label="Disk cleanup summary metrics">
      <div className="summary-card hero">
        <div className="hero-top">
          <span className="summary-label">
            <Sparkles size={14} className="hero-sparkle" />
            Projected free space after cleanup
          </span>
          <span className="hero-tag">+{formatGB(selectedTotal)} reclaimable</span>
        </div>

        <strong className="hero-metric">{formatGB(after)}</strong>

        <div className="before-after" title={`Available disk: from ${formatGB(data.baseFreeBytes)} to ${formatGB(after)}`}>
          <span style={{ width: `${percentGain}%` }} />
          <i aria-hidden="true" />
        </div>

        <div className="summary-foot">
          <span>Current free: <b>{formatGB(data.baseFreeBytes)}</b></span>
          <span>Projected: <b>{formatGB(after)}</b></span>
        </div>
      </div>

      <div className="summary-card">
        <span className="summary-label">
          <span className="mini-dot safe-dot" aria-hidden="true" />
          Safe to remove
        </span>
        <strong>{formatGB(safe)}</strong>
        <span className="summary-caption">
          {data.items.filter(i => i.tier === 'safe').length} build & package caches
        </span>
      </div>

      <div className="summary-card">
        <span className="summary-label">
          <span className="mini-dot review-dot" aria-hidden="true" />
          Requires review
        </span>
        <strong>{formatGB(review)}</strong>
        <span className="summary-caption">
          {data.items.filter(i => i.tier === 'review').length} models & dev dependencies
        </span>
      </div>

      <div className="summary-card">
        <span className="summary-label">
          <span className="mini-dot ink-dot" aria-hidden="true" />
          Surveyed footprint
        </span>
        <strong>{formatGB(data.scannedBytes)}</strong>
        <span className="summary-caption">Across indexed directories</span>
      </div>
    </section>
  )
}
