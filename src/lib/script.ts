import type { RecommendationItem } from '../types/scan'

export interface ScriptValidation { ok: boolean; checks: { label: string; ok: boolean }[]; errors: string[] }
const DANGEROUS_CHARS_REGEX = /[`$;|&<>*?\[\]{}()\\!#\n\r\0]/

export const PROTECTED_HOME_FOLDERS = new Set([
  'Desktop',
  'Documents',
  'Downloads',
  'Library',
  'Pictures',
  'Music',
  'Movies',
])

export function isProtectedFolder(path: string): boolean {
  if (!path || typeof path !== 'string' || !path.startsWith('~/')) return false
  const clean = path.replace(/\/+$/, '').slice(2).trim()
  return (
    PROTECTED_HOME_FOLDERS.has(clean) ||
    Array.from(PROTECTED_HOME_FOLDERS).some(p => p.toLowerCase() === clean.toLowerCase())
  )
}

function isSafePath(path: string) {
  if (!path || typeof path !== 'string') return false
  if (path === '~' || path === '~/' || path.startsWith('/') || path.startsWith('\\')) return false
  if (!path.startsWith('~/') || path.slice(2).trim().length === 0) return false
  if (path.includes('..')) return false
  if (DANGEROUS_CHARS_REGEX.test(path)) return false
  if (isProtectedFolder(path)) return false
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
  const insideHome = paths.length > 0 && paths.every(isSafePath)
  const noProtected = paths.every(path => !isProtectedFolder(path))
  const noTraversal = paths.every(path => !path.includes('..'))
  const noDanger = paths.every(path => !DANGEROUS_CHARS_REGEX.test(path))

  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const p of paths) {
    if (seen.has(p)) duplicates.add(p)
    seen.add(p)
  }
  const unique = duplicates.size === 0

  const quoted = paths.every(path => {
    const q = quotePath(path)
    return (q.startsWith("'") || q.startsWith('"$HOME"/')) && q.endsWith("'")
  })

  const errors = [] as string[]
  if (!insideHome || !noProtected) {
    if (!noProtected) {
      errors.push('Direct targeting of protected user folders (Desktop, Documents, Downloads, Library, Pictures, Music, Movies) is prohibited.')
    } else {
      errors.push('Bare ~, ~/, and absolute paths are rejected; paths must be relative to ~/ with a subpath.')
    }
  }
  if (!noTraversal) errors.push('Path traversal (..) is not allowed.')
  if (!noDanger) errors.push('Shell metacharacters and wildcards are not allowed.')
  if (!unique) errors.push(`Duplicate paths detected: ${Array.from(duplicates).join(', ')}.`)
  if (!quoted) errors.push('Every path must be properly quoted.')

  return {
    ok: errors.length === 0,
    checks: [
      { label: 'All paths inside home folder', ok: insideHome && noProtected },
      { label: 'Paths are quoted', ok: quoted },
      { label: 'No sudo, no wildcards', ok: noDanger && noTraversal },
      { label: 'No duplicate paths', ok: unique },
    ],
    errors,
  }
}
export function buildScript(items: RecommendationItem[]) {
  const validation = validatePaths(items)
  if (!validation.ok) throw new Error(validation.errors.join(' '))
  const lines = ['#!/bin/sh', 'set -eu', '', '# Tidyr cleanup script — review before running', '']
  items.forEach(item => { lines.push(`# ${item.label} (${(item.size / 1_000_000_000).toFixed(1)} GB)`); item.paths.forEach(path => lines.push(`rm -rf -- ${quotePath(path)}`)); lines.push('') })
  return lines.join('\n').trim() + '\n'
}
