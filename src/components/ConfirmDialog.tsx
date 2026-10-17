import { useEffect } from 'react'
import { AlertTriangle, X, Terminal, Check } from 'lucide-react'

interface ConfirmDialogProps {
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ onCancel, onConfirm }: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <button className="dialog-close" onClick={onCancel} aria-label="Close dialog">
          <X size={18} />
        </button>

        <div className="dialog-icon" aria-hidden="true">
          <Terminal size={22} />
        </div>

        <p className="eyebrow">Export generated script</p>
        <h2>Copy commands to clipboard?</h2>
        <p className="muted">
          Tidyr will copy a formatted POSIX shell script to your system clipboard.
          Nothing is executed on your device automatically. You maintain total control to inspect, modify, or run the script in your terminal.
        </p>

        <div className="dialog-assurances">
          <div className="dialog-check-item">
            <Check size={14} className="safe-text" />
            <span>Guaranteed zero automatic executions</span>
          </div>
          <div className="dialog-check-item">
            <Check size={14} className="safe-text" />
            <span>All file targets strictly validated inside home path</span>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="button ghost" onClick={onCancel}>
            Keep reviewing
          </button>
          <button type="button" className="button primary" onClick={onConfirm}>
            Copy to clipboard
          </button>
        </div>
      </div>
    </div>
  )
}
