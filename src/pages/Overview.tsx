import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Map, Sparkles } from 'lucide-react'
import { useScanStore } from '../store/scanStore'
import { LoadingState, ErrorState } from '../components/States'
import { ScanPanel } from '../features/overview/ScanPanel'
import { SummaryBar } from '../features/overview/SummaryBar'
import { CategoryBreakdown } from '../features/overview/CategoryBreakdown'
import { LargestFolders } from '../features/overview/LargestFolders'
import { Treemap } from '../features/explorer/Treemap'
import type { FolderNode } from '../types/scan'

export default function Overview() {
  const { data, status, error } = useScanStore()
  const navigate = useNavigate()

  if (status === 'loading' && !data) {
    return <LoadingState label="Mapping your home folder…" />
  }

  if (status === 'error' && !data) {
    return <ErrorState message={error || 'Unknown scan error.'} />
  }

  if (!data) return null

  const handleOpenFolder = (node: FolderNode) => {
    navigate('/explorer', { state: { selectedNodeId: node.id } })
  }

  return (
    <div className="page overview-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">Local disk survey</span>
          <h1>Make room for the next build.</h1>
          <p className="lede">
            A quiet, local map of what’s taking up space, with safe cleanup candidates clearly distinguished.
          </p>
        </div>
        <div className="intro-actions">
          <Link className="button outline" to="/cleanup">
            <Sparkles size={15} />
            Review cleanup <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      <ScanPanel />
      <SummaryBar />

      <div className="overview-grid">
        <section className="map-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Interactive visualizer</span>
              <h2>Storage survey map</h2>
            </div>
            <Link className="micro-link" to="/explorer">
              Explore full hierarchy <ArrowUpRight size={13} />
            </Link>
          </div>

          <Treemap
            nodes={data.tree.children || []}
            mode="category"
            items={data.items}
            onOpen={handleOpenFolder}
          />
        </section>

        <div className="overview-side">
          <CategoryBreakdown />
          <LargestFolders />
        </div>
      </div>

      <div className="quiet-note">
        <Map size={16} aria-hidden="true" />
        <span>
          Everything stays local to this machine. Tidyr only inspects file sizes and generates reproducible scripts for your manual review.
        </span>
        <Link to="/cleanup">
          See recommendations <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  )
}
