import { CheckCircle2, X } from 'lucide-react'
import { useToastStore } from '../store/toastStore'

export function Toast({ message: propMessage }: { message?: string }) {
  const storeMessage = useToastStore(s => s.message)
  const hide = useToastStore(s => s.hide)
  const message = propMessage ?? storeMessage

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircle2 size={16} className="toast-icon" />
      <span className="toast-text">{message}</span>
      <button className="toast-close" onClick={hide} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}
