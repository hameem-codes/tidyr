import { describe, it, expect } from 'vitest'
import {
  filterItems,
  isItemIdleEligible,
  isIdleProjectItem,
} from './filter'
import type { RecommendationItem } from '../types/scan'

describe('filterItems - Cleanup filtering and sorting', () => {
  const activeNext: RecommendationItem = {
    id: 'next-output-active',
    label: 'active-app/.next',
    tier: 'safe',
    size: 250_000_000,
    paths: ['~/projects/active-app/.next'],
    note: 'Next.js build cache',
    daysIdle: 3,
  }

  const activeNodeModules: RecommendationItem = {
    id: 'node-modules-active',
    label: 'active-app/node_modules',
    tier: 'review',
    size: 600_000_000,
    paths: ['~/projects/active-app/node_modules'],
    note: 'Dependencies for active app',
    daysIdle: 5,
  }

  const idle654NodeModules: RecommendationItem = {
    id: 'node-modules-idle-654',
    label: 'legacy-project/node_modules',
    tier: 'review',
    size: 850_000_000,
    paths: ['~/archive/legacy-project/node_modules'],
    note: 'Dependencies unused for nearly two years',
    daysIdle: 654,
  }

  const mediumIdleItem: RecommendationItem = {
    id: 'node-modules-medium',
    label: 'client-portal/node_modules',
    tier: 'review',
    size: 400_000_000,
    paths: ['~/work/client-portal/node_modules'],
    note: 'Portal dependencies',
    daysIdle: 60,
  }

  const safeGlobalCache: RecommendationItem = {
    id: 'npm-cache',
    label: 'npm cache',
    tier: 'safe',
    size: 1_200_000_000,
    paths: ['~/.npm/_cacache'],
    note: 'Global package cache',
  }

  const sampleItems: RecommendationItem[] = [
    activeNext,
    activeNodeModules,
    idle654NodeModules,
    mediumIdleItem,
    safeGlobalCache,
  ]

  describe('J4 test cases', () => {
    it("an active project's .next shows in All and Safe", () => {
      const allResult = filterItems([activeNext], { filter: 'all', idleDays: 90 })
      expect(allResult).toContainEqual(activeNext)

      const safeResult = filterItems([activeNext], { filter: 'safe', idleDays: 90 })
      expect(safeResult).toContainEqual(activeNext)

      // It should not show in Idle tab
      const idleResult = filterItems([activeNext], { filter: 'idle', idleDays: 90 })
      expect(idleResult).not.toContainEqual(activeNext)
    })

    it('an active node_modules shows in All and Review but not Idle', () => {
      const allResult = filterItems([activeNodeModules], { filter: 'all', idleDays: 90 })
      expect(allResult).toContainEqual(activeNodeModules)

      const reviewResult = filterItems([activeNodeModules], { filter: 'review', idleDays: 90 })
      expect(reviewResult).toContainEqual(activeNodeModules)

      const idleResult = filterItems([activeNodeModules], { filter: 'idle', idleDays: 90 })
      expect(idleResult).not.toContainEqual(activeNodeModules)
      expect(idleResult).toHaveLength(0)
    })

    it('a 654-day-idle node_modules shows in Idle', () => {
      const idleResult = filterItems([idle654NodeModules], { filter: 'idle', idleDays: 90 })
      expect(idleResult).toContainEqual(idle654NodeModules)
      expect(idleResult).toHaveLength(1)
    })

    it('changing idleDays changes the Idle results', () => {
      // At default 90 days: 654-day item is included, 60-day and 5-day are not
      const idleAt90 = filterItems(sampleItems, { filter: 'idle', idleDays: 90 })
      expect(idleAt90.map(i => i.id)).toEqual(['node-modules-idle-654'])

      // At 30 days: both 654-day and 60-day items are included
      const idleAt30 = filterItems(sampleItems, { filter: 'idle', idleDays: 30 })
      expect(idleAt30.map(i => i.id)).toContain('node-modules-idle-654')
      expect(idleAt30.map(i => i.id)).toContain('node-modules-medium')
      expect(idleAt30.map(i => i.id)).not.toContain('node-modules-active')

      // At 700 days: neither item qualifies
      const idleAt700 = filterItems(sampleItems, { filter: 'idle', idleDays: 700 })
      expect(idleAt700).toHaveLength(0)
    })
  })

  describe('General filtering and sorting behaviors', () => {
    it('All tab returns every item regardless of idle threshold or tier', () => {
      const result = filterItems(sampleItems, { filter: 'all', idleDays: 90 })
      expect(result).toHaveLength(sampleItems.length)
      expect(result.map(i => i.id)).toEqual(
        expect.arrayContaining(sampleItems.map(i => i.id))
      )
    })

    it('Safe tab includes both active and idle safe items without idle filtering', () => {
      const result = filterItems(sampleItems, { filter: 'safe', idleDays: 90 })
      expect(result.map(i => i.id)).toEqual(['npm-cache', 'next-output-active'])
      expect(result.every(i => i.tier === 'safe')).toBe(true)
    })

    it('Review tab includes all review items without idle filtering', () => {
      const result = filterItems(sampleItems, { filter: 'review', idleDays: 90 })
      expect(result.map(i => i.id)).toEqual([
        'node-modules-idle-654',
        'node-modules-active',
        'node-modules-medium',
      ])
      expect(result.every(i => i.tier === 'review')).toBe(true)
    })

    it('filters correctly by search query matching label, path, or note', () => {
      const byLabel = filterItems(sampleItems, { query: 'portal' })
      expect(byLabel.map(i => i.id)).toEqual(['node-modules-medium'])

      const byPath = filterItems(sampleItems, { query: 'archive' })
      expect(byPath.map(i => i.id)).toEqual(['node-modules-idle-654'])

      const byNote = filterItems(sampleItems, { query: 'Next.js' })
      expect(byNote.map(i => i.id)).toEqual(['next-output-active'])
    })

    it('sorts by size-desc, size-asc, and label', () => {
      const desc = filterItems(sampleItems, { sortMode: 'size-desc' })
      expect(desc.map(i => i.size)).toEqual([
        1_200_000_000,
        850_000_000,
        600_000_000,
        400_000_000,
        250_000_000,
      ])

      const asc = filterItems(sampleItems, { sortMode: 'size-asc' })
      expect(asc.map(i => i.size)).toEqual([
        250_000_000,
        400_000_000,
        600_000_000,
        850_000_000,
        1_200_000_000,
      ])

      const alphabetical = filterItems(sampleItems, { sortMode: 'label' })
      expect(alphabetical.map(i => i.label)).toEqual([
        'active-app/.next',
        'active-app/node_modules',
        'client-portal/node_modules',
        'legacy-project/node_modules',
        'npm cache',
      ])
    })
  })

  describe('Idle helper functions', () => {
    it('isItemIdleEligible computes days from lastModified timestamp and date strings', () => {
      const twoHundredDaysAgo = Date.now() - 200 * 86400 * 1000
      const itemWithTs: RecommendationItem = {
        id: 'ts-item',
        label: 'test',
        tier: 'review',
        size: 100,
        paths: ['~/test/node_modules'],
        note: '',
        lastModified: twoHundredDaysAgo,
      }
      expect(isItemIdleEligible(itemWithTs, 90)).toBe(true)
      expect(isItemIdleEligible(itemWithTs, 300)).toBe(false)

      const itemWithIsoString: RecommendationItem = {
        ...itemWithTs,
        lastModified: new Date(twoHundredDaysAgo).toISOString(),
      }
      expect(isItemIdleEligible(itemWithIsoString, 90)).toBe(true)
      expect(isItemIdleEligible(itemWithIsoString, 300)).toBe(false)
    })

    it('isIdleProjectItem identifies candidate items based on id, paths, or idle attributes', () => {
      expect(isIdleProjectItem(activeNext)).toBe(true)
      expect(isIdleProjectItem(activeNodeModules)).toBe(true)
      expect(isIdleProjectItem({
        id: 'custom-turbo',
        label: 'turbo',
        tier: 'safe',
        size: 100,
        paths: ['~/app/.turbo'],
        note: '',
      })).toBe(true)
      expect(isIdleProjectItem({
        id: 'global-cache',
        label: 'global',
        tier: 'safe',
        size: 100,
        paths: ['~/.cache'],
        note: '',
      })).toBe(false)
    })
  })
})
