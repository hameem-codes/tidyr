import { useEffect } from 'react'
import { Moon, Sun, Monitor, X, Shield, RefreshCw } from 'lucide-react'
import { useSettingsStore, type TreemapColorPalette } from '../../store/settingsStore'
import { useToastStore } from '../../store/toastStore'
import { useDialogA11y } from '../../hooks/useDialogA11y'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useSettingsStore()
  const showToast = useToastStore(s => s.show)
  const containerRef = useDialogA11y<HTMLDivElement>()

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

  const handleResetDefaults = () => {
    settings.setScanFolder('~')
    settings.setIdleDays(90)
    settings.setMoveToTrash(false)
    settings.setTheme('system')
    settings.setTreemapColors('default')
    showToast('Preferences reset to default values')
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={containerRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">Local configuration</span>
            <h2 id="settings-dialog-title">Settings</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Scan & Cleanup</h3>

            <label className="field">
              <span>Default scan directory</span>
              <input
                type="text"
                value={settings.scanFolder}
                onChange={e => settings.setScanFolder(e.target.value)}
                placeholder="~"
              />
              <small>Use ~ for user home folder root or specify an absolute directory path.</small>
            </label>

            <label className="field">
              <span>Idle project candidate threshold</span>
              <select
                value={settings.idleDays}
                onChange={e => settings.setIdleDays(Number(e.target.value))}
              >
                <option value={14}>14 days since last git commit or build</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days of inactivity</option>
                <option value={90}>90 days of inactivity (Recommended)</option>
              </select>
              <small>Flags unbuilt node_modules and target folders in dormant repositories.</small>
            </label>

            <div className="setting-line">
              <div>
                <strong>Move to Trash instead of immediate deletion</strong>
                <small>Emits Finder delete on macOS or <code>gio trash</code> on Linux.</small>
              </div>
              <input
                type="checkbox"
                checked={settings.moveToTrash}
                onChange={e => settings.setMoveToTrash(e.target.checked)}
              />
            </div>

            <label className="field">
              <span>Operating system platform</span>
              <select
                value={settings.platform}
                onChange={e => settings.setPlatform(e.target.value as 'darwin' | 'linux' | 'other')}
              >
                <option value="darwin">macOS (Finder trash via osascript)</option>
                <option value="linux">Linux (gio trash)</option>
                <option value="other">Other Unix (rm fallback)</option>
              </select>
              <small>Autodetected from browser. Sets appropriate native trash commands without CLI dependencies.</small>
            </label>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>

            <div className="theme-choice">
              <div>
                <strong>Interface theme</strong>
                <small className="muted">Paper light mode or deep forest dark mode</small>
              </div>
              <div className="theme-buttons">
                <button
                  type="button"
                  className={settings.theme === 'light' ? 'selected' : ''}
                  onClick={() => settings.setTheme('light')}
                >
                  <Sun size={15} />
                  Light
                </button>
                <button
                  type="button"
                  className={settings.theme === 'dark' ? 'selected' : ''}
                  onClick={() => settings.setTheme('dark')}
                >
                  <Moon size={15} />
                  Dark
                </button>
                <button
                  type="button"
                  className={settings.theme === 'system' ? 'selected' : ''}
                  onClick={() => settings.setTheme('system')}
                >
                  <Monitor size={15} />
                  System
                </button>
              </div>
            </div>

            <label className="field">
              <span>Treemap colors</span>
              <select
                value={settings.treemapColors}
                onChange={e => settings.setTreemapColors(e.target.value as TreemapColorPalette)}
              >
                <option value="default">Default category palette</option>
                <option value="high-contrast">High contrast</option>
                <option value="monochrome">Monochrome slate</option>
              </select>
              <small>Choose visual palette for treemap tiles and category breakdown.</small>
            </label>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">About & Privacy</h3>

            <div className="about-info-grid">
              <div className="about-info-item">
                <span className="about-info-label">Version</span>
                <span className="about-info-value">v0.1.0</span>
              </div>
              <div className="about-info-item">
                <span className="about-info-label">Connectivity</span>
                <span className="about-info-value">Works 100% offline</span>
              </div>
              <div className="about-info-item">
                <span className="about-info-label">Telemetry</span>
                <span className="about-info-value">No telemetry or analytics</span>
              </div>
            </div>

            <div className="about-block">
              <div className="about-header">
                <Shield size={16} className="safe-text" />
                <strong>Privacy & Safety Promise</strong>
              </div>
              <p className="muted small">
                Tidyr is completely local-first. It connects to no remote servers, collects zero telemetry, and never deletes, renames, or modifies your files directly. All cleanup actions are generated as transparent, reviewable shell scripts for manual execution.
              </p>
              <button
                type="button"
                className="text-button"
                onClick={handleResetDefaults}
              >
                <RefreshCw size={13} />
                Reset all preferences to defaults
              </button>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
