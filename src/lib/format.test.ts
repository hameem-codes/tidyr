import { describe, it, expect } from 'vitest'
import {
  formatBytes,
  formatGB,
  formatCompactGB,
  homePath,
  pathTail,
  formatRelativeTime,
} from './format'

describe('format.ts - P5.3 Formatting utilities', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes as 0 B', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('formats byte multiples accurately', () => {
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB')
    })

    it('supports custom decimal precision', () => {
      expect(formatBytes(1536, 2)).toBe('1.50 KB')
    })
  })

  describe('formatGB and formatCompactGB', () => {
    it('formats decimal gigabytes', () => {
      expect(formatGB(5000000000)).toBe('5.0 GB')
      expect(formatGB(12300000000, 2)).toBe('12.30 GB')
    })

    it('compacts >= 10GB to 0 decimals and < 10GB to 1 decimal', () => {
      expect(formatCompactGB(4500000000)).toBe('4.5 GB')
      expect(formatCompactGB(15000000000)).toBe('15 GB')
    })
  })

  describe('homePath and pathTail', () => {
    it('normalizes homePath', () => {
      expect(homePath('~')).toBe('~')
      expect(homePath('~/Desktop')).toBe('~/Desktop')
    })

    it('extracts pathTail', () => {
      expect(pathTail('~/Desktop/atlas/node_modules')).toBe('node_modules')
      expect(pathTail('~')).toBe('~')
      expect(pathTail('')).toBe('~')
    })
  })

  describe('formatRelativeTime', () => {
    it('handles falsy input as never', () => {
      expect(formatRelativeTime('')).toBe('never')
    })

    it('formats just now for very recent times', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 10000)).toBe('just now')
    })

    it('formats minutes ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 65 * 1000)).toBe('1 minute ago')
      expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5 minutes ago')
    })

    it('formats hours ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 65 * 60 * 1000)).toBe('1 hour ago')
      expect(formatRelativeTime(now - 4 * 3600 * 1000)).toBe('4 hours ago')
    })

    it('formats yesterday and days ago', () => {
      const now = Date.now()
      expect(formatRelativeTime(now - 25 * 3600 * 1000)).toBe('yesterday')
      expect(formatRelativeTime(now - 4 * 86400 * 1000)).toBe('4 days ago')
    })
  })
})
