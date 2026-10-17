import { Moon, Sun, X, Shield, RefreshCw } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useToastStore } from '../../store/toastStore'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useSettingsStore()
  const showToast = useToastStore(s => s.show)

  const handleResetDefaults = () => {
    settings.setScanFolder('~')
    settings.setIdleDays(30)
    settings.setMoveToTrash(false)
    settings.setTheme('light')
    showToast('Preferences reset to default values')
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">Local configuration</span>
            <h2>Settings</h2>
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
              <option value={30}>30 days (Recommended)</option>
              <option value={60}>60 days of inactivity</option>
              <option value={90}>90 days of inactivity</option>
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
            </div>
          </div>

          <div className="about-block">
            <div className="about-header">
              <Shield size={16} className="safe-text" />
              <strong>Privacy & Safety Promise</strong>
            </div>
            <p className="muted small">
              Tidyr is 100% local-first. It connects to no remote servers, collects zero telemetry, and never deletes, renames, or touches your files directly. All cleanup actions are delivered as reproducible shell scripts for your manual verification.
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

        <div className="modal-foot">
          <button type="button" className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
