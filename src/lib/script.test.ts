import { describe, it, expect } from 'vitest'
import { quotePath, validatePaths, buildScript } from './script'

describe('script.ts - P5.1 Tilde conversion and quoting', () => {
  it('expands ~/path to "$HOME"/\'path\'', () => {
    expect(quotePath('~/.npm')).toBe('"$HOME"/\'.npm\'')
    expect(quotePath('~/Desktop/project/node_modules')).toBe('"$HOME"/\'Desktop/project/node_modules\'')
  })

  it('preserves bare ~ as "$HOME"', () => {
    expect(quotePath('~')).toBe('"$HOME"')
  })

  it('escapes single quotes in the tail segment properly', () => {
    expect(quotePath("~/foo'bar")).toBe('"$HOME"/\'foo\'\\\'\'bar\'')
    expect(quotePath("~/john's code/cache")).toBe('"$HOME"/\'john\'\\\'\'s code/cache\'')
  })

  it('quotes paths without tilde using single quotes', () => {
    expect(quotePath('simple/path')).toBe('\'simple/path\'')
    expect(quotePath("name'with'quote")).toBe('\'name\'\\\'\'with\'\\\'\'quote\'')
  })

  it('ensures $HOME is outside single quotes so shell expansion works', () => {
    const quoted = quotePath('~/.cache/pip')
    expect(quoted.startsWith('"$HOME"/')).toBe(true)
    expect(quoted).not.toMatch(/^'~/)
  })
})

describe('script.ts - P5.2 Rejected paths and buildScript parity', () => {
  const makeItem = (paths: string[], id = 'item-1') => ({
    id,
    label: 'Test Item',
    tier: 'safe' as const,
    size: 1000000,
    paths,
    note: 'Test note',
  })

  describe('Path validation rejections', () => {
    it('rejects bare ~ and ~/', () => {
      expect(validatePaths([makeItem(['~'])]).ok).toBe(false)
      expect(validatePaths([makeItem(['~/'])]).ok).toBe(false)
    })

    it('rejects absolute paths', () => {
      expect(validatePaths([makeItem(['/etc/hosts'])]).ok).toBe(false)
      expect(validatePaths([makeItem(['/Users/test'])]).ok).toBe(false)
      expect(validatePaths([makeItem(['C:\\Windows'])]).ok).toBe(false)
    })

    it('rejects directory traversal containing ..', () => {
      const res = validatePaths([makeItem(['~/project/../../etc'])])
      expect(res.ok).toBe(false)
      expect(res.errors.some(e => e.includes('traversal'))).toBe(true)
    })

    it('rejects shell metacharacters and wildcards', () => {
      const chars = [';', '&', '|', '*', '?', '$', '`', '<', '>', '\\']
      for (const char of chars) {
        const res = validatePaths([makeItem([`~/cache/test${char}dir`])])
        expect(res.ok).toBe(false)
      }
    })

    it('rejects direct targeting of protected folders', () => {
      const protectedList = [
        '~/Desktop', '~/Documents', '~/Downloads',
        '~/Library', '~/Pictures', '~/Music', '~/Movies',
        '~/desktop/', '~/DOCUMENTS',
      ]
      for (const p of protectedList) {
        const res = validatePaths([makeItem([p])])
        expect(res.ok).toBe(false)
        expect(res.errors.some(e => e.includes('protected'))).toBe(true)
      }
    })

    it('allows safe subfolders inside protected directories', () => {
      const res = validatePaths([makeItem(['~/Desktop/atlas/.next', '~/Library/Developer/Xcode/DerivedData'])])
      expect(res.ok).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('rejects duplicate paths across items', () => {
      const res = validatePaths([
        makeItem(['~/project/cache'], 'i1'),
        makeItem(['~/project/cache'], 'i2'),
      ])
      expect(res.ok).toBe(false)
      expect(res.errors.some(e => e.includes('Duplicate'))).toBe(true)
    })

    it('rejects paths attempting sudo injection', () => {
      const res = validatePaths([makeItem(['~/foo/sudo/rm'])])
      expect(res.ok).toBe(false)
      expect(res.errors.some(e => e.includes('sudo'))).toBe(true)
    })
  })

  describe('buildScript options & preview parity', () => {
    const sampleItems = [
      makeItem(['~/Desktop/atlas/.next', '~/Desktop/atlas/node_modules']),
    ]

    it('generates standard rm -rf when dryRun and trash are false', () => {
      const script = buildScript(sampleItems, { dryRun: false, trash: false })
      expect(script).toContain('rm -rf -- "$HOME"/\'Desktop/atlas/.next\'')
      expect(script).toContain('rm -rf -- "$HOME"/\'Desktop/atlas/node_modules\'')
      expect(script).not.toContain('echo "[dry-run]')
    })

    it('generates echo preview without rm -rf when dryRun is true', () => {
      const script = buildScript(sampleItems, { dryRun: true })
      expect(script).toContain('echo "[dry-run] would remove: " "$HOME"/\'Desktop/atlas/.next\'')
      expect(script).not.toContain('rm -rf')
    })

    it('uses osascript Finder delete for macOS trash', () => {
      const script = buildScript(sampleItems, { trash: true, platform: 'darwin' })
      expect(script).toContain('osascript -e \'tell application "Finder" to delete POSIX file "\'"$HOME"\'/Desktop/atlas/.next"\'')
      expect(script).not.toContain('rm -rf')
    })

    it('uses gio trash for Linux trash', () => {
      const script = buildScript(sampleItems, { trash: true, platform: 'linux' })
      expect(script).toContain('gio trash "$HOME"/\'Desktop/atlas/.next\'')
      expect(script).not.toContain('rm -rf')
    })

    it('throws error when trash requested on unsupported platform', () => {
      expect(() => buildScript(sampleItems, { trash: true, platform: 'other' })).toThrow(/Trash is only supported/i)
    })

    it('guarantees preview and copied script parity for identical parameters', () => {
      const previewScript = buildScript(sampleItems, { dryRun: false, trash: true, platform: 'darwin' })
      const copiedScript = buildScript(sampleItems, { dryRun: false, trash: true, platform: 'darwin' })
      expect(previewScript).toBe(copiedScript)
    })
  })
})
