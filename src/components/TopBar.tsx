import { Link, NavLink } from 'react-router-dom'
import { Moon, Settings, Sun, LayoutDashboard, FolderTree, Sparkles } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useSelectionStore } from '../store/selectionStore'
import { useScanStore } from '../store/scanStore'
import { formatRelativeTime } from '../lib/format'

export function TopBar({ onSettings }: { onSettings: () => void }) {
  const { theme, resolvedTheme, setTheme } = useSettingsStore()
  const data = useScanStore(s => s.data)
  const selectedCount = useSelectionStore(s => s.selectedIds.length)

  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brand-mark" aria-hidden="true" />
        <span>Tidyr</span>
      </Link>

      <nav className="topnav" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Overview
        </NavLink>
        <NavLink to="/explorer" className={({ isActive }) => (isActive ? 'active' : '')}>
          Explorer
        </NavLink>
        <NavLink to="/cleanup" className={({ isActive }) => (isActive ? 'active' : '')}>
          Cleanup
          {selectedCount > 0 && <span className="nav-badge">{selectedCount}</span>}
        </NavLink>
      </nav>

      <div className="top-actions">
        <span className="scanned-pill">
          <span className="status-dot" aria-hidden="true" />
          <span>{data ? `Scanned ${formatRelativeTime(data.scannedAt)}` : 'Ready to scan'}</span>
        </span>

        <button
          type="button"
          className="icon-button"
          aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
          title={`Theme: ${theme} (${resolvedTheme})`}
          onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        >
          {resolvedTheme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button
          type="button"
          className="icon-button"
          aria-label="Open settings"
          title="Tidyr Settings"
          onClick={onSettings}
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  )
}

export function MobileTabs() {
  const selectedCount = useSelectionStore(s => s.selectedIds.length)

  return (
    <nav className="mobile-tabs" aria-label="Mobile navigation">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <LayoutDashboard size={18} />
        <span>Overview</span>
      </NavLink>
      <NavLink to="/explorer" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FolderTree size={18} />
        <span>Explorer</span>
      </NavLink>
      <NavLink to="/cleanup" className={({ isActive }) => (isActive ? 'active' : '')}>
        <div className="mobile-tab-icon-wrap">
          <Sparkles size={18} />
          {selectedCount > 0 && <span className="mobile-badge">{selectedCount}</span>}
        </div>
        <span>Cleanup</span>
      </NavLink>
    </nav>
  )
}
