import { ShieldCheck, AlertTriangle } from 'lucide-react'
import type { Tier } from '../types/scan'

export function SafetyBadge({ tier }: { tier: Tier }) {
  const isSafe = tier === 'safe'

  return (
    <span
      className={`safety-badge ${isSafe ? 'safe' : 'review'}`}
      title={
        isSafe
          ? 'Safe: Expendable caches and build artifacts that regenerate automatically'
          : 'Review: AI weights, project node_modules, or environments that take time to redownload'
      }
    >
      <span className="badge-icon" aria-hidden="true">
        {isSafe ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
      </span>
      <span>{isSafe ? 'Safe' : 'Review'}</span>
    </span>
  )
}
