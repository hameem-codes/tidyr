import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useScanStore } from '../../store/scanStore'
import { formatGB } from '../../lib/format'

export function LargestFolders() {
  const children = [
    ...(useScanStore(s => s.data!.tree.children) || []),
  ]
    .sort((a, b) => b.size - a.size)
    .slice(0, 4)

  return (
    <div className="side-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Footprint leaders</span>
          <h3>Largest directories</h3>
        </div>
        <Link className="micro-link" to="/explorer">
          Open map <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="largest-list">
        {children.map((folder, i) => (
          <Link
            to="/explorer"
            state={{ selectedNodeId: folder.id }}
            className="largest-row"
            key={folder.id}
            title={`Inspect ${folder.name} in Explorer`}
          >
            <span className="rank">0{i + 1}</span>
            <span className="folder-summary">
              <strong>{folder.name}</strong>
              <code>{folder.path}</code>
            </span>
            <b className="folder-size">{formatGB(folder.size)}</b>
          </Link>
        ))}
      </div>
    </div>
  )
}
