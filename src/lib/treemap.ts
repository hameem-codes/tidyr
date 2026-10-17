import type { FolderNode } from '../types/scan'

export interface TreemapRect { node: FolderNode; x: number; y: number; width: number; height: number }

type Box = { node: FolderNode; area: number }
function worst(row: Box[], side: number) {
  if (!row.length) return Infinity
  const areas = row.map(item => item.area)
  const sum = areas.reduce((a, b) => a + b, 0)
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
}
function layoutRow(row: Box[], x: number, y: number, width: number, height: number, total: number): TreemapRect[] {
  const result: TreemapRect[] = []
  const horizontal = width >= height
  const rowArea = row.reduce((sum, item) => sum + item.area, 0)
  if (horizontal) {
    const rowHeight = rowArea / width
    let cursor = x
    row.forEach(item => { const itemWidth = item.area / rowHeight; result.push({ node: item.node, x: cursor, y, width: itemWidth, height: rowHeight }); cursor += itemWidth })
  } else {
    const rowWidth = rowArea / height
    let cursor = y
    row.forEach(item => { const itemHeight = item.area / rowWidth; result.push({ node: item.node, x, y: cursor, width: rowWidth, height: itemHeight }); cursor += itemHeight })
  }
  return result
}
export function squarify(nodes: FolderNode[], width: number, height: number): TreemapRect[] {
  const positive = nodes.filter(n => n.size > 0)
  if (!positive.length || width <= 0 || height <= 0) return []
  const total = positive.reduce((sum, n) => sum + n.size, 0)
  const scale = width * height / total
  const boxes = positive.map(node => ({ node, area: node.size * scale })).sort((a, b) => b.area - a.area)
  const result: TreemapRect[] = []
  let remaining = [...boxes]
  let x = 0, y = 0, w = width, h = height
  while (remaining.length) {
    const row: Box[] = []
    const side = Math.min(w, h)
    while (remaining.length && (!row.length || worst([...row, remaining[0]], side) <= worst(row, side))) row.push(remaining.shift()!)
    result.push(...layoutRow(row, x, y, w, h, total))
    const rowArea = row.reduce((sum, item) => sum + item.area, 0)
    if (w >= h) { const rowHeight = rowArea / w; y += rowHeight; h -= rowHeight } else { const rowWidth = rowArea / h; x += rowWidth; w -= rowWidth }
  }
  return result
}
