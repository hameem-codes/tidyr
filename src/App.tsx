import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { UploadCloud } from 'lucide-react'
import { TopBar, MobileTabs } from './components/TopBar'
import { Toast } from './components/Toast'
import { useSettingsStore } from './store/settingsStore'
import { useScanStore } from './store/scanStore'
import { useSelectionStore } from './store/selectionStore'
import { useToastStore } from './store/toastStore'
import { SettingsModal } from './features/settings/SettingsModal'
import Overview from './pages/Overview'
import Explorer from './pages/Explorer'
import Cleanup from './pages/Cleanup'
import type { ScanData } from './types/scan'

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
  const setData = useScanStore(s => s.setData)
  const showToast = useToastStore(s => s.show)
  const syncDefaults = useSelectionStore(s => s.syncDefaults)
  const resolvedTheme = useSettingsStore(s => s.resolvedTheme)
  const syncResolvedTheme = useSettingsStore(s => s.syncResolvedTheme)
  const [settings, setSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.endsWith('.json')) {
      showToast('Please drop a valid JSON file (e.g. scan.json)')
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as ScanData
      if (!parsed || typeof parsed !== 'object' || !parsed.tree || !Array.isArray(parsed.items)) {
        showToast('Invalid scan file: missing tree or items array')
        return
      }
      setData(parsed, false)
      showToast(`Loaded scan data from ${file.name}`)
    } catch {
      showToast('Error reading or parsing dropped JSON file')
    }
  }

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
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', resolvedTheme === 'dark' ? '#121A18' : '#EEF1F0')
  }, [resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => syncResolvedTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [syncResolvedTheme])

  return (
    <div
      className="app-shell"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
      {isDragging && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-modal">
            <UploadCloud size={48} className="drag-drop-icon" />
            <h3>Drop scan.json to load</h3>
            <p className="muted small">Release file to inspect disk survey and cleanup candidates</p>
          </div>
        </div>
      )}
    </div>
  )
}
