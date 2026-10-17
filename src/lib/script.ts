import type { RecommendationItem } from '../types/scan'

export interface ScriptValidation { ok: boolean; checks: { label: string; ok: boolean }[]; errors: string[] }
const homePathPattern = /^(~|~\/[^\0]+|\/home\/[^\0]+)$/
function isSafePath(path: string) {
  return homePathPattern.test(path) && !path.includes('..') && !/[`$;|&<>*?\[\]{}]/.test(path)
}
export function quotePath(path: string) { return `'${path.replace(/'/g, "'\\''")}'` }
export function validatePaths(items: RecommendationItem[]): ScriptValidation {
  const paths = items.flatMap(item => item.paths)
  const insideHome = paths.every(isSafePath)
  const quoted = paths.every(path => quotePath(path).startsWith("'") && quotePath(path).endsWith("'"))
  const noDanger = paths.every(path => !/[`$;|&<>*?\[\]{}]/.test(path))
  const unique = new Set(paths).size === paths.length
  const errors = [] as string[]
  if (!insideHome) errors.push('One or more paths are outside the home folder.')
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
