import type { RecommendationItem } from '../types/scan'

export interface ScriptValidation { ok: boolean; checks: { label: string; ok: boolean }[]; errors: string[] }
function isSafePath(path: string) {
  if (!path || typeof path !== 'string') return false
  if (path === '~' || path === '~/' || path.startsWith('/') || path.startsWith('\\')) return false
  if (!path.startsWith('~/') || path.slice(2).trim().length === 0) return false
  return !path.includes('..') && !/[`$;|&<>*?\[\]{}]/.test(path)
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
  const quoted = paths.every(path => {
    const q = quotePath(path)
    return (q.startsWith("'") || q.startsWith('"$HOME"/')) && q.endsWith("'")
  })
  const noDanger = paths.every(path => !/[`$;|&<>*?\[\]{}]/.test(path))
  const unique = new Set(paths).size === paths.length
  const errors = [] as string[]
  if (!insideHome) errors.push('Bare ~, ~/, and absolute paths are rejected; paths must be relative to ~/ with a subpath.')
  if (!quoted) errors.push('Every path must be quoted.')
  if (!noDanger) errors.push('Shell expansion characters are not allowed.')
  if (!unique) errors.push('Duplicate paths are not allowed.')
  return { ok: errors.length === 0, checks: [{label:'All paths inside home folder', ok: insideHome}, {label:'Paths are quoted', ok: quoted}, {label:'No sudo, no wildcards', ok: noDanger}, {label:'No duplicate paths', ok: unique}], errors }
}
export function buildScript(items: RecommendationItem[]) {
  const validation = validatePaths(items)
  if (!validation.ok) throw new Error(validation.errors.join(' '))
  const lines = ['#!/bin/sh', 'set -eu', '', '# Tidyr cleanup script — review before running', '']
  items.forEach(item => { lines.push(`# ${item.label} (${(item.size / 1_000_000_000).toFixed(1)} GB)`); item.paths.forEach(path => lines.push(`rm -rf -- ${quotePath(path)}`)); lines.push('') })
  return lines.join('\n').trim() + '\n'
}
