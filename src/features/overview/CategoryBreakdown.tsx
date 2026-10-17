import { useMemo } from 'react'
import { useScanStore } from '../../store/scanStore'
import { useSettingsStore } from '../../store/settingsStore'
import { formatGB } from '../../lib/format'

const lightColors: Record<string, string> = {
  'Code projects': '#2D594D',
  'AI models': '#68658A',
  'Package caches': '#B87A14',
  'SDKs': '#3F7A85',
  'Documents': '#76877F',
}

const darkColors: Record<string, string> = {
  'Code projects': '#52B395',
  'AI models': '#928FB8',
  'Package caches': '#E09F36',
  'SDKs': '#5BB2C2',
  'Documents': '#9AAEA4',
}

export function CategoryBreakdown() {
  const tree = useScanStore(s => s.data!.tree)
  const theme = useSettingsStore(s => s.resolvedTheme)
  const colors = theme === 'dark' ? darkColors : lightColors

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    tree.children?.forEach(n => {
      map.set(n.category, (map.get(n.category) || 0) + n.size)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [tree])

  const total = tree.size

  return (
    <div className="side-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Composition</span>
          <h3>Storage by category</h3>
        </div>
        <span className="micro-label">{formatGB(total, 0)} mapped</span>
      </div>

      <div className="category-list">
        {categories.map(([name, size]) => {
          const color = colors[name] || (theme === 'dark' ? '#7A8F87' : '#65726E')
          const pct = ((size / total) * 100).toFixed(0)

          return (
            <div className="category-row" key={name}>
              <span
                className="category-swatch"
                style={{ background: color }}
                aria-hidden="true"
              />
              <span className="category-name">{name}</span>
              <strong className="category-size">{formatGB(size)}</strong>
              <div className="category-bar">
                <i
                  style={{
                    width: `${Math.max(2, (size / total) * 100)}%`,
                    background: color,
                  }}
                  title={`${name}: ${pct}%`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
