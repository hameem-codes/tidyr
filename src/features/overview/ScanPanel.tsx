import { useState } from 'react'
import { ArrowUpRight, CheckCircle2, ChevronDown, FolderSearch, RefreshCw } from 'lucide-react'
import { useScanStore } from '../../store/scanStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FolderPickerModal } from './FolderPickerModal'
import { formatRelativeTime } from '../../lib/format'

export function ScanPanel() {
  const { data, status, progress, folders, scan } = useScanStore()
  const { scanFolder } = useSettingsStore()
  const [expanded, setExpanded] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  const running = status === 'loading'
  if (!data) return null

  const getFolderLabel = (folder: string) => {
    if (folder === '~') return 'Home'
    const parts = folder.split('/').filter(Boolean)
    return parts[parts.length - 1] || 'Folder'
  }

  return (
    <>
      <section className="scan-panel">
        <div className="scan-main">
          <div className="scan-folder">
            <span className="folder-icon" aria-hidden="true">
              <FolderSearch size={18} />
            </span>
            <div>
              <span className="summary-label">Target directory</span>
              <strong>
                {scanFolder}{' '}
                <span className="muted">({getFolderLabel(scanFolder)})</span>
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={() => setShowFolderPicker(true)}
          >
            Change <ArrowUpRight size={14} />
          </button>

          <div className="scan-progress">
            <div className="progress-meta">
              <span>
                {running ? (
                  `${progress}% scanning…`
                ) : (
                  <>
                    <CheckCircle2 size={14} />{' '}
                    Scanned {formatRelativeTime(data.scannedAt)}
                  </>
                )}
              </span>
              <span>
                {running
                  ? `${folders.toLocaleString()} folders`
                  : '84,210 folders'}
              </span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={running ? progress : 100} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${running ? progress : 100}%` }} />
            </div>
          </div>

          <button
            type="button"
            className="button dark scan-button"
            onClick={() => scan()}
            disabled={running}
          >
            <RefreshCw className={running ? 'spin' : ''} size={15} />
            {running ? 'Scanning…' : 'Scan again'}
          </button>
        </div>

        {data.skipped && data.skipped.length > 0 && (
          <>
            <button
              type="button"
              className="skipped-toggle"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <span>Skipped / unreadable system folders ({data.skipped.length})</span>
              <ChevronDown className={expanded ? 'rotate' : ''} size={16} />
            </button>

            {expanded && (
              <div className="skipped-list">
                {data.skipped.map(folder => (
                  <div key={folder.path}>
                    <code>{folder.path}</code>
                    <span>{folder.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {showFolderPicker && (
        <FolderPickerModal onClose={() => setShowFolderPicker(false)} />
      )}
    </>
  )
}
