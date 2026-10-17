import { Layers, Sparkles } from 'lucide-react'

export type ExplorerMode = 'category' | 'cleanup'

interface ViewToggleProps {
  mode: ExplorerMode
  setMode: (mode: ExplorerMode) => void
}

export function ViewToggle({ mode, setMode }: ViewToggleProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Explorer color scheme">
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'category'}
        className={mode === 'category' ? 'active' : ''}
        onClick={() => setMode('category')}
      >
        <Layers size={14} />
        <span>By Category</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === 'cleanup'}
        className={mode === 'cleanup' ? 'active' : ''}
        onClick={() => setMode('cleanup')}
      >
        <Sparkles size={14} />
        <span>By Cleanup Safety</span>
      </button>
    </div>
  )
}
