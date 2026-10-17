import { useState, useEffect } from 'react'
import { Folder, FolderSearch, X, Check, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useScanStore } from '../../store/scanStore'
import { useToastStore } from '../../store/toastStore'

const FOLDER_PRESETS = [
  { path: '~', label: 'Home folder', desc: 'All user documents, caches, and developer data' },
  { path: '~/Projects', label: 'Projects', desc: 'Git repositories, build outputs, and node_modules' },
  { path: '~/Developer', label: 'Developer directory', desc: 'Xcode tools, SDK intermediates, and local builds' },
  { path: '~/.cache', label: 'Caches & packages', desc: 'NPM, Gradle, Pip, and browser temporary files' },
]

export function FolderPickerModal({ onClose }: { onClose: () => void }) {
  const { scanFolder, setScanFolder } = useSettingsStore()
  const { scan } = useScanStore()
  const showToast = useToastStore(s => s.show)
  const [customPath, setCustomPath] = useState(scanFolder)

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

  const handleSelect = async (path: string) => {
    setScanFolder(path)
    onClose()
    showToast(`Scanning target folder: ${path}`)
    await scan()
  }

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (customPath.trim()) {
      handleSelect(customPath.trim())
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="dialog folder-picker-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="dialog-icon">
          <FolderSearch size={22} />
        </div>

        <p className="eyebrow">Target location</p>
        <h2>Select scan folder</h2>
        <p className="muted">
          Choose which local directory Tidyr should analyze for disk usage and safe cleanup candidates.
        </p>

        <div className="folder-presets-list">
          {FOLDER_PRESETS.map(preset => {
            const isSelected = scanFolder === preset.path
            return (
              <button
                key={preset.path}
                type="button"
                className={`folder-preset-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(preset.path)}
              >
                <div className="preset-icon">
                  <Folder size={17} />
                </div>
                <div className="preset-details">
                  <strong>{preset.label} <code>{preset.path}</code></strong>
                  <small>{preset.desc}</small>
                </div>
                {isSelected && <Check size={16} className="preset-check" />}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmitCustom} className="custom-folder-form">
          <label className="field">
            <span>Custom folder path</span>
            <div className="custom-input-row">
              <input
                type="text"
                placeholder="e.g. ~/work/repositories"
                value={customPath}
                onChange={e => setCustomPath(e.target.value)}
              />
              <button type="submit" className="button primary compact-btn">
                Scan <ArrowRight size={14} />
              </button>
            </div>
            <small>Must be located within your home directory for safe verification.</small>
          </label>
        </form>
      </div>
    </div>
  )
}
