import { useState, useMemo, useEffect } from 'react'
import { Clipboard, X, CheckCircle2, Circle, ShieldAlert, Terminal, Sparkles } from 'lucide-react'
import { buildScript, validatePaths, quotePath } from '../../lib/script'
import { formatGB } from '../../lib/format'
import { useSettingsStore } from '../../store/settingsStore'
import { useToastStore } from '../../store/toastStore'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import type { RecommendationItem } from '../../types/scan'

interface ScriptDrawerProps {
  items: RecommendationItem[]
  onClose: () => void
  onCopy: (script: string) => void
}

export function ScriptDrawer({ items, onClose, onCopy }: ScriptDrawerProps) {
  const [read, setRead] = useState(false)
  const [closedApps, setClosedApps] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const { moveToTrash, setMoveToTrash, platform } = useSettingsStore()
  const showToast = useToastStore(s => s.show)
  const containerRef = useDialogA11y<HTMLElement>()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const validation = validatePaths(items)

  const rawScript = useMemo(() => {
    try {
      return buildScript(items, { dryRun, trash: moveToTrash, platform })
    } catch (err) {
      return `# Validation failed:\n# ${(err as Error).message || 'Unable to build a safe script for this selection.'}`
    }
  }, [items, dryRun, moveToTrash, platform])

  const handleCopyOneLiner = async () => {
    const oneLiner = items
      .flatMap(i => i.paths)
      .map(p => quotePath(p))
      .join(' ')
    const cmd = `du -sh ${oneLiner}`
    try {
      await navigator.clipboard?.writeText(cmd)
      showToast('Copied inspection command (du -sh) to clipboard')
    } catch {
      showToast('Command generated')
    }
  }

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0)
  const isReady = validation.ok && read && closedApps

  return (
    <aside
      ref={containerRef}
      className="script-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-drawer-title"
      tabIndex={-1}
    >
      <div className="drawer-head">
        <div>
          <span className="eyebrow">Local script inspector</span>
          <h2 id="script-drawer-title">Generated script</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close script inspector"
        >
          <X size={18} />
        </button>
      </div>

      <div className="drawer-scroll">
        <div className="script-stat">
          <div>
            <strong>{formatGB(totalBytes)}</strong>
            <p className="muted small">Reclaimable across {items.length} selected items</p>
          </div>
          <span className="script-badge">POSIX /bin/sh</span>
        </div>

        <section className="drawer-section">
          <h3>Safety assurances</h3>
          <div className="check-grid">
            {validation.checks.map(check => (
              <div className="check-row" key={check.label}>
                {check.ok ? (
                  <CheckCircle2 className="check-ok" size={16} />
                ) : (
                  <ShieldAlert className="check-warn" size={16} />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>

          {!validation.ok && validation.errors.length > 0 && (
            <div className="drawer-errors-box" role="alert">
              <strong>Validation failed:</strong>
              <ul>
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="drawer-section">
          <h3>Execution mode</h3>
          <div className="drawer-options-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => {
                  setDryRun(e.target.checked)
                  if (e.target.checked) setMoveToTrash(false)
                }}
              />
              <div>
                <strong>Dry-run simulation mode</strong>
                <small>Echoes paths instead of issuing removal commands</small>
              </div>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={moveToTrash && !dryRun}
                disabled={dryRun}
                onChange={e => setMoveToTrash(e.target.checked)}
              />
              <div>
                <strong>Move to Trash (Finder on macOS, gio on Linux)</strong>
                <small>Allows easy Finder recovery if needed</small>
              </div>
            </label>
          </div>
        </section>

        <div className="script-preview-container">
          <div className="script-preview-bar">
            <span className="script-preview-title">
              <Terminal size={13} /> tidyr_cleanup.sh
            </span>
            <button
              type="button"
              className="text-button copy-oneliner-btn"
              onClick={handleCopyOneLiner}
              title="Copy shell command to check directory sizes before removing"
            >
              Copy <code>du -sh</code> check
            </button>
          </div>
          <pre className="script-preview">
            <code>{rawScript}</code>
          </pre>
        </div>

        <section className="drawer-section">
          <h3>Manual acknowledgments</h3>
          <label className="check-row interactive">
            <input
              type="checkbox"
              checked={read}
              onChange={e => setRead(e.target.checked)}
            />
            {read ? <CheckCircle2 className="check-ok" size={16} /> : <Circle size={16} />}
            <span>I have inspected the target paths in the script above</span>
          </label>

          <label className="check-row interactive">
            <input
              type="checkbox"
              checked={closedApps}
              onChange={e => setClosedApps(e.target.checked)}
            />
            {closedApps ? <CheckCircle2 className="check-ok" size={16} /> : <Circle size={16} />}
            <span>I closed applications that might currently be using these caches</span>
          </label>
        </section>

        <section className="drawer-section alternatives">
          <h3>CLI alternatives for package caches</h3>
          <code>npm cache clean --force</code>
          <code>brew cleanup --prune=all</code>
          <code>docker system prune -f</code>
        </section>
      </div>

      <div className="drawer-foot">
        <button
          type="button"
          className="button primary full"
          disabled={!isReady}
          onClick={() => onCopy(rawScript)}
        >
          <Clipboard size={15} />
          {isReady ? 'Copy verified script' : 'Complete checklist to copy'}
        </button>
      </div>
    </aside>
  )
}
