import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { TopBar, MobileTabs } from './components/TopBar'
import { Toast } from './components/Toast'
import { useSettingsStore } from './store/settingsStore'
import { useScanStore } from './store/scanStore'
import { useSelectionStore } from './store/selectionStore'
import { SettingsModal } from './features/settings/SettingsModal'
import Overview from './pages/Overview'
import Explorer from './pages/Explorer'
import Cleanup from './pages/Cleanup'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return null
}

export default function App() {
  const load = useScanStore(s => s.load)
  const data = useScanStore(s => s.data)
  const syncDefaults = useSelectionStore(s => s.syncDefaults)
  const resolvedTheme = useSettingsStore(s => s.resolvedTheme)
  const syncResolvedTheme = useSettingsStore(s => s.syncResolvedTheme)
  const [settings, setSettings] = useState(false)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (data) {
      syncDefaults(data.items)
    }
  }, [data, syncDefaults])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => syncResolvedTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [syncResolvedTheme])

  return (
    <div className="app-shell">
      <ScrollToTop />
      <TopBar onSettings={() => setSettings(true)} />
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/cleanup" element={<Cleanup />} />
        </Routes>
      </main>
      <MobileTabs />
      <Toast />
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  )
}
