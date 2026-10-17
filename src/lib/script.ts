import type { RecommendationItem } from '../types/scan'

export interface ScriptValidation { ok: boolean; checks: { label: string; ok: boolean }[]; errors: string[] }
const DANGEROUS_CHARS_REGEX = /["`$;|&<>*?\[\]{}()\\!#\n\r\0]/

export const KNOWN_CACHE_LOCATIONS = new Set([
  '~/.npm',
  '~/.gradle/caches',
  '~/Library/Developer/Xcode/DerivedData',
  '~/.cache/pip',
  '~/.cache/uv',
  '~/.cache/puppeteer',
  '~/Library/Android',
  '~/.ollama/models',
  '~/.docker',
  '~/.cache/huggingface',
])

export const ALLOWED_LAST_FOLDERS = new Set(['node_modules', '.next', '.turbo'])

export function isAllowedPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (path.includes('"')) return false
  if (!path.startsWith('~/')) return false
  const clean = path.replace(/\/+$/, '')
  if (KNOWN_CACHE_LOCATIONS.has(clean)) return true
  const parts = clean.split('/')
  const lastFolder = parts[parts.length - 1]
  if (ALLOWED_LAST_FOLDERS.has(lastFolder)) return true
  return false
}

export function isProtectedFolder(path: string): boolean {
  return !isAllowedPath(path)
}

function isSafePath(path: string) {
  if (!path || typeof path !== 'string') return false
  if (path === '~' || path === '~/' || path.startsWith('/') || path.startsWith('\\')) return false
  if (!path.startsWith('~/') || path.slice(2).trim().length === 0) return false
  if (path.includes('..')) return false
  if (path.includes('"')) return false
  if (DANGEROUS_CHARS_REGEX.test(path)) return false
  if (!isAllowedPath(path)) return false
  return true
}

export function quotePath(path: string) {
  if (path.startsWith('~/')) {
    const tail = path.slice(2).replace(/'/g, "'\\''")
    return `"$HOME"/'${tail}'`
  }
  if (path === '~') {
    return '"$HOME"'
  }
  return `'${path.replace(/'/g, "'\\''")}'`
}

export function validatePaths(items: RecommendationItem[]): ScriptValidation {
  const paths = items.flatMap(item => item.paths)
  const insideHome = paths.length > 0 && paths.every(p => typeof p === 'string' && p.startsWith('~/') && p.length > 2)
  const noDoubleQuotes = paths.every(path => typeof path === 'string' && !path.includes('"'))
  const allowed = paths.every(isAllowedPath)
  const noTraversal = paths.every(path => typeof path === 'string' && !path.includes('..'))
  const noDanger = paths.every(path => typeof path === 'string' && !DANGEROUS_CHARS_REGEX.test(path))
  const noSudo = paths.every(path => typeof path === 'string' && !/(^|[^a-zA-Z0-9_-])sudo([^a-zA-Z0-9_-]|$)/i.test(path))

  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const p of paths) {
    if (seen.has(p)) duplicates.add(p)
    seen.add(p)
  }
  const unique = duplicates.size === 0

  const errors = [] as string[]
  if (!allowed) {
    errors.push('Target paths must be known cache locations or end in node_modules, .next, or .turbo (protected or unlisted folders are not allowed).')
  }
  if (!noDoubleQuotes) {
    errors.push('Paths containing double quotes are rejected.')
  }
  if (!insideHome && allowed) {
    errors.push('Bare ~, ~/, and absolute paths are rejected; paths must be relative to ~/ with a subpath.')
  }
  if (!noTraversal) errors.push('Path traversal (..) is not allowed.')
  if (!noDanger && noDoubleQuotes) errors.push('Shell metacharacters and wildcards are not allowed.')
  if (!noSudo) errors.push('Commands or paths involving sudo are strictly forbidden.')
  if (!unique) errors.push(`Duplicate paths detected: ${Array.from(duplicates).join(', ')}.`)

  const ok = insideHome && allowed && noDoubleQuotes && noTraversal && noDanger && noSudo && unique

  return {
    ok,
    checks: [
      { label: 'All paths inside allowed cache locations', ok: insideHome && allowed && noDoubleQuotes },
      { label: 'No sudo', ok: noSudo },
      { label: 'No wildcards or shell metacharacters', ok: noDanger && noTraversal && noDoubleQuotes },
      { label: 'No duplicate paths', ok: unique },
    ],
    errors,
  }
}
export type Platform = 'darwin' | 'linux' | 'other'

export interface BuildScriptOptions {
  dryRun?: boolean
  trash?: boolean
  platform?: Platform
}

export function buildScript(items: RecommendationItem[], options: BuildScriptOptions = {}) {
  const validation = validatePaths(items)
  if (!validation.ok) throw new Error(validation.errors.join(' '))
  const { dryRun = false, trash = false, platform = 'darwin' } = options

  const lines = ['#!/bin/sh', 'set -eu', '', '# Tidyr cleanup script — review before running', '']
  items.forEach(item => {
    lines.push(`# ${item.label} (${(item.size / 1_000_000_000).toFixed(1)} GB)`)
    item.paths.forEach(path => {
      const quoted = quotePath(path)
      if (dryRun) {
        lines.push(`echo "[dry-run] would remove: " ${quoted}`)
      } else if (trash) {
        if (platform === 'darwin') {
          const tail = (path.startsWith('~/') ? path.slice(2) : path).replace(/'/g, "'\\''")
          lines.push(`osascript -e 'tell application "Finder" to delete POSIX file "'"$HOME"'/${tail}"'`)
        } else if (platform === 'linux') {
          lines.push(`gio trash ${quoted}`)
        } else {
          lines.push(`rm -rf -- ${quoted}`)
        }
      } else {
        lines.push(`rm -rf -- ${quoted}`)
      }
    })
    lines.push('')
  })
  return lines.join('\n').trim() + '\n'
}
