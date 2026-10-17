import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useScanStore } from '../store/scanStore'
import { useSelectionStore } from '../store/selectionStore'
import { LoadingState, ErrorState } from '../components/States'
import { Breadcrumb } from '../features/explorer/Breadcrumb'
import { ViewToggle, type ExplorerMode } from '../features/explorer/ViewToggle'
import { Treemap } from '../features/explorer/Treemap'
import { FolderDetail } from '../features/explorer/FolderDetail'
import type { FolderNode } from '../types/scan'

function findNodeById(root: FolderNode, id: string): { node: FolderNode; path: FolderNode[] } | null {
  if (root.id === id) return { node: root, path: [root] }
  if (root.children) {
    for (const child of root.children) {
      const res = findNodeById(child, id)
      if (res) {
        return { node: res.node, path: [root, ...res.path] }
      }
    }
  }
  return null
}

export default function Explorer() {
  const { data, status, error } = useScanStore()
  const location = useLocation()
  const [path, setPath] = useState<FolderNode[]>([])
  const [mode, setMode] = useState<ExplorerMode>('category')
  const [selected, setSelected] = useState<FolderNode | null>(null)
  const toggle = useSelectionStore(s => s.toggle)

  // Handle incoming selection from Overview page navigation
  useEffect(() => {
    if (data && location.state && (location.state as { selectedNodeId?: string }).selectedNodeId) {
      const targetId = (location.state as { selectedNodeId: string }).selectedNodeId
      const found = findNodeById(data.tree, targetId)
      if (found) {
        setSelected(found.node)
        // If it's a child folder, set the breadcrumb path up to its parent
        if (found.path.length > 2) {
          setPath(found.path.slice(1, -1))
        }
      }
    }
  }, [data, location.state])

  if (status === 'loading' && !data) return <LoadingState />
  if (status === 'error' && !data) return <ErrorState message={error || 'Unknown scan error.'} />
  if (!data) return null

  const root = path[path.length - 1] || data.tree
  const nodes = root.children?.length ? root.children : [root]
  const item = selected?.candidate ? data.items.find(i => i.id === selected.candidate) : undefined
  const breadcrumbs = [data.tree, ...path.filter(n => n.id !== data.tree.id)]

  const openNode = (node: FolderNode) => {
    setSelected(node)
    if (node.children?.length) {
      setPath([...path, node])
    }
  }

  const handleSelectBreadcrumb = (index: number) => {
    setPath(breadcrumbs.slice(1, index + 1))
    setSelected(null)
  }

  return (
    <div className="page explorer-page">
      <div className="page-intro compact">
        <div>
          <span className="eyebrow">Interactive visualizer</span>
          <h1>Explorer</h1>
          <p className="lede">
            Click any block to drill down into subdirectories. Switch to Cleanup mode to spotlight reclaimable items.
          </p>
        </div>
        <ViewToggle mode={mode} setMode={setMode} />
      </div>

      <div className="explorer-breadcrumb">
        <Breadcrumb nodes={breadcrumbs} onSelect={handleSelectBreadcrumb} />
        <span className="hint">Click a folder to navigate down · Click breadcrumb to return</span>
      </div>

      <div className="explorer-layout">
        <section className="map-card explorer-map">
          <Treemap nodes={nodes} mode={mode} items={data.items} onOpen={openNode} />
        </section>
        <FolderDetail node={selected} item={item} onAdd={() => item && toggle(item.id)} />
      </div>
    </div>
  )
}
