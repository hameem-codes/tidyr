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
function layoutRow(row: Box[], x: number, y: number, width: number, height: number): TreemapRect[] {
  const result: TreemapRect[] = []
  const rowArea = row.reduce((sum, item) => sum + item.area, 0)
  if (width >= height) {
    // When w >= h, place the row as a column on the left and stack items vertically
    const rowWidth = height > 0 ? rowArea / height : 0
    let cursorY = y
    row.forEach(item => {
      const itemHeight = rowWidth > 0 ? item.area / rowWidth : 0
      result.push({ node: item.node, x, y: cursorY, width: rowWidth, height: itemHeight })
      cursorY += itemHeight
    })
  } else {
    // When w < h, place the row on top and stack items horizontally
    const rowHeight = width > 0 ? rowArea / width : 0
    let cursorX = x
    row.forEach(item => {
      const itemWidth = rowHeight > 0 ? item.area / rowHeight : 0
      result.push({ node: item.node, x: cursorX, y, width: itemWidth, height: rowHeight })
      cursorX += itemWidth
    })
  }
  return result
}
export function squarify(nodes: FolderNode[], width: number, height: number): TreemapRect[] {
  const positive = nodes.filter(n => n.size > 0)
  if (!positive.length || width <= 0 || height <= 0) return []
  const total = positive.reduce((sum, n) => sum + n.size, 0)
  const scale = (width * height) / total
  const boxes = positive.map(node => ({ node, area: node.size * scale })).sort((a, b) => b.area - a.area)
  const result: TreemapRect[] = []
  let remaining = [...boxes]
  let x = 0, y = 0, w = width, h = height
  while (remaining.length) {
    const row: Box[] = []
    const side = Math.min(w, h)
    while (remaining.length && (!row.length || worst([...row, remaining[0]], side) <= worst(row, side))) {
      row.push(remaining.shift()!)
    }
    result.push(...layoutRow(row, x, y, w, h))
    const rowArea = row.reduce((sum, item) => sum + item.area, 0)
    if (w >= h) {
      const rowWidth = h > 0 ? rowArea / h : 0
      x += rowWidth
      w -= rowWidth
    } else {
      const rowHeight = w > 0 ? rowArea / w : 0
      y += rowHeight
      h -= rowHeight
    }
  }
  return result
}
