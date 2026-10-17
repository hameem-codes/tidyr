import { useMemo, useState } from 'react'
import { squarify } from '../../lib/treemap'
import { formatGB } from '../../lib/format'
import { SafetyBadge } from '../../components/SafetyBadge'
import { useSettingsStore } from '../../store/settingsStore'
import type { FolderNode, RecommendationItem } from '../../types/scan'
import type { ExplorerMode } from './ViewToggle'

const lightCategoryColors: Record<string, string> = {
  'Code projects': '#2D4B42',
  'AI models': '#68658A',
  'Package caches': '#B87A14',
  'SDKs': '#3F7A85',
  'Documents': '#7C8E85',
  'Home': '#2D4B42',
}

const darkCategoryColors: Record<string, string> = {
  'Code projects': '#365E53',
  'AI models': '#6E6B91',
  'Package caches': '#BF8426',
  'SDKs': '#427F8C',
  'Documents': '#5F756C',
  'Home': '#365E53',
}

interface TreemapProps {
  nodes: FolderNode[]
  mode: ExplorerMode
  items: RecommendationItem[]
  onOpen: (node: FolderNode) => void
}

interface HoveredTile {
  node: FolderNode
  candidate?: RecommendationItem
  x: number
  y: number
  percent: number
}

export function Treemap({ nodes, mode, items, onOpen }: TreemapProps) {
  const [hovered, setHovered] = useState<HoveredTile | null>(null)
  const theme = useSettingsStore(s => s.theme)
  const categoryColors = theme === 'dark' ? darkCategoryColors : lightCategoryColors

  const rects = useMemo(() => squarify(nodes, 1000, 520), [nodes])
  const totalSize = useMemo(() => nodes.reduce((sum, n) => sum + n.size, 0), [nodes])
  const itemByCandidate = useMemo(() => new Map(items.map(item => [item.id, item])), [items])

  return (
    <div className="treemap-shell" onMouseLeave={() => setHovered(null)}>
      <div className="treemap-canvas" role="region" aria-label="Interactive disk usage treemap">
        {rects.map(rect => {
          const candidate = rect.node.candidate ? itemByCandidate.get(rect.node.candidate) : undefined
          const tone =
            mode === 'cleanup'
              ? candidate?.tier === 'review'
                ? theme === 'dark' ? '#D6982E' : '#C98A1B'
                : candidate
                ? theme === 'dark' ? '#3B966F' : '#2E7D5B'
                : theme === 'dark' ? '#46554F' : '#A2B0A7'
              : categoryColors[rect.node.category] || '#4A5B55'

          const widthPct = rect.width / 10
          const heightPct = rect.height / 5.2
          const isCompactWidth = widthPct < 8.5
          const isCompactHeight = heightPct < 14
          const isTiny = isCompactWidth || isCompactHeight
          const isMicro = heightPct < 7 || widthPct < 6
          const percentOfParent = totalSize > 0 ? (rect.node.size / totalSize) * 100 : 0

          return (
            <button
              key={rect.node.id}
              type="button"
              className={`map-tile ${candidate ? 'candidate' : ''} ${isTiny ? 'tile-compact' : ''} ${isMicro ? 'tile-micro' : ''}`}
              style={{
                left: `${rect.x / 10}%`,
                top: `${rect.y / 5.2}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                backgroundColor: tone,
              }}
              onClick={() => onOpen(rect.node)}
              onMouseEnter={(e) => {
                const rectBounds = e.currentTarget.getBoundingClientRect()
                const parentBounds = e.currentTarget.parentElement?.getBoundingClientRect()
                if (parentBounds) {
                  setHovered({
                    node: rect.node,
                    candidate,
                    x: rectBounds.left - parentBounds.left + rectBounds.width / 2,
                    y: rectBounds.top - parentBounds.top,
                    percent: percentOfParent,
                  })
                }
              }}
              title={`${rect.node.name} · ${formatGB(rect.node.size)}${candidate ? ` · ${candidate.tier}` : ''}`}
            >
              <span className="tile-label">{rect.node.name}</span>
              {!isTiny && <span className="tile-size">{formatGB(rect.node.size)}</span>}
              {candidate && !isTiny && (
                <span className="tile-badge">
                  <SafetyBadge tier={candidate.tier} />
                </span>
              )}
              {candidate && isTiny && (
                <span
                  className="tile-dot-badge"
                  style={{
                    backgroundColor: candidate.tier === 'safe' ? '#2E7D5B' : '#C98A1B',
                  }}
                  title={candidate.tier === 'safe' ? 'Safe cleanup candidate' : 'Review candidate'}
                />
              )}
            </button>
          )
        })}

        {hovered && (
          <div
            className="treemap-tooltip"
            style={{
              left: `${Math.min(Math.max(hovered.x, 120), 880)}px`,
              top: `${hovered.y < 100 ? hovered.y + 14 : hovered.y - 10}px`,
              transform: hovered.y < 100 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
          >
            <div className="tooltip-header">
              <strong>{hovered.node.name}</strong>
              <span>{hovered.percent.toFixed(1)}% of view</span>
            </div>
            <div className="tooltip-path"><code>{hovered.node.path}</code></div>
            <div className="tooltip-meta">
              <span>Usage: <b>{formatGB(hovered.node.size)}</b></span>
              <span>Category: <b>{hovered.node.category}</b></span>
            </div>
            {hovered.candidate && (
              <div className="tooltip-candidate">
                <SafetyBadge tier={hovered.candidate.tier} />
                <p>{hovered.candidate.note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="treemap-list">
        {[...nodes]
          .sort((a, b) => b.size - a.size)
          .map(node => {
            const candidate = node.candidate ? itemByCandidate.get(node.candidate) : undefined
            const tone =
              mode === 'cleanup'
                ? candidate?.tier === 'review'
                  ? '#C98A1B'
                  : candidate
                  ? '#2E7D5B'
                  : '#AFBCB4'
                : categoryColors[node.category] || '#2D4640'

            return (
              <button
                key={node.id}
                type="button"
                className="map-list-row"
                onClick={() => onOpen(node)}
              >
                <span className="list-color" style={{ background: tone }} aria-hidden="true" />
                <span className="list-info">
                  <strong>{node.name}</strong>
                  <code>{node.path}</code>
                </span>
                <b className="list-size">{formatGB(node.size)}</b>
                {candidate && <SafetyBadge tier={candidate.tier} />}
              </button>
            )
          })}
      </div>

      <div className="map-legend">
        {mode === 'cleanup' ? (
          <>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#3B966F' : '#2E7D5B' }} aria-hidden="true" />
              Safe to remove
            </span>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#D6982E' : '#C98A1B' }} aria-hidden="true" />
              Needs review
            </span>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#46554F' : '#A2B0A7' }} aria-hidden="true" />
              Retained data
            </span>
          </>
        ) : (
          <>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#365E53' : '#2D4B42' }} aria-hidden="true" />
              Code
            </span>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#6E6B91' : '#68658A' }} aria-hidden="true" />
              AI Models
            </span>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#BF8426' : '#B87A14' }} aria-hidden="true" />
              Package Caches
            </span>
            <span>
              <i className="legend-dot" style={{ background: theme === 'dark' ? '#427F8C' : '#3F7A85' }} aria-hidden="true" />
              SDKs
            </span>
          </>
        )}
        <span className="legend-hatch">
          <span className="hatch-swatch" aria-hidden="true" />
          Hatched = Cleanup candidate
        </span>
      </div>
    </div>
  )
}
