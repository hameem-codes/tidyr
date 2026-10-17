import { describe, it, expect } from 'vitest'
import { squarify } from './treemap'
import type { FolderNode } from '../types/scan'
import sampleScan from '../../public/scan.json'

describe('treemap.ts - P5.3 Treemap layout and squarify algorithm', () => {
  const makeNode = (name: string, size: number, id = name): FolderNode => ({
    id,
    name,
    path: `~/${name}`,
    size,
    category: 'Code projects',
  })

  it('returns empty array when given empty nodes or zero/negative dimensions', () => {
    expect(squarify([], 800, 600)).toEqual([])
    expect(squarify([makeNode('a', 100)], 0, 600)).toEqual([])
    expect(squarify([makeNode('a', 100)], 800, -10)).toEqual([])
  })

  it('ignores nodes with non-positive sizes', () => {
    const nodes = [makeNode('a', 100), makeNode('empty', 0), makeNode('neg', -5)]
    const rects = squarify(nodes, 500, 500)
    expect(rects).toHaveLength(1)
    expect(rects[0].node.name).toBe('a')
    expect(rects[0].width).toBeCloseTo(500)
    expect(rects[0].height).toBeCloseTo(500)
  })

  it('correctly partitions area proportional to node sizes', () => {
    const nodes = [
      makeNode('large', 750),
      makeNode('small', 250),
    ]
    const width = 1000
    const height = 500
    const totalArea = width * height

    const rects = squarify(nodes, width, height)
    expect(rects).toHaveLength(2)

    const largeRect = rects.find(r => r.node.name === 'large')!
    const smallRect = rects.find(r => r.node.name === 'small')!

    const largeArea = largeRect.width * largeRect.height
    const smallArea = smallRect.width * smallRect.height

    expect(largeArea / totalArea).toBeCloseTo(0.75, 2)
    expect(smallArea / totalArea).toBeCloseTo(0.25, 2)
  })

  it('keeps all computed coordinates within bounds with valid positive dimensions', () => {
    const nodes = [
      makeNode('a', 400),
      makeNode('b', 300),
      makeNode('c', 200),
      makeNode('d', 100),
    ]
    const width = 800
    const height = 600
    const rects = squarify(nodes, width, height)

    expect(rects).toHaveLength(4)
    rects.forEach(rect => {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + 0.01)
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + 0.01)
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.height).toBeGreaterThan(0)
      expect(Number.isNaN(rect.x)).toBe(false)
      expect(Number.isNaN(rect.width)).toBe(false)
    })
  })

  it('G2: every tile for sample scan.json has aspect ratio under 6:1 and tile areas sum to container area', () => {
    const nodes = (sampleScan as any).tree.children as FolderNode[]
    const width = 800
    const height = 600
    const containerArea = width * height

    const rects = squarify(nodes, width, height)
    expect(rects.length).toBe(nodes.length)

    let totalTileArea = 0
    for (const rect of rects) {
      const area = rect.width * rect.height
      totalTileArea += area

      const maxSide = Math.max(rect.width, rect.height)
      const minSide = Math.min(rect.width, rect.height)
      const aspectRatio = minSide > 0 ? maxSide / minSide : Infinity

      expect(aspectRatio).toBeLessThan(6)
    }

    expect(totalTileArea).toBeCloseTo(containerArea, 1)
  })
})
