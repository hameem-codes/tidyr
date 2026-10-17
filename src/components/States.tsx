import { AlertCircle, FolderOpen, LoaderCircle } from 'lucide-react'

export function LoadingState({
  label = 'Surveying local directories…',
}: {
  label?: string
}) {
  return (
    <div className="state-card" role="status">
      <LoaderCircle className="spin" size={26} aria-hidden="true" />
      <strong>{label}</strong>
      <span className="muted">
        Calculating disk usage and detecting build caches across your hierarchy.
      </span>
    </div>
  )
}

export function EmptyState({
  title = 'No recommendations found',
  subtitle = 'Your target directory has no recognized disposable caches or idle folders.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="state-card">
      <FolderOpen size={28} className="muted" aria-hidden="true" />
      <strong>{title}</strong>
      <span className="muted">{subtitle}</span>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-card error-state" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <strong>Unable to complete scan survey</strong>
      <span className="muted">{message}</span>
    </div>
  )
}
