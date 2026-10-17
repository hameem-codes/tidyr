import { describe, it, expect } from 'vitest'
import { quotePath } from './script'

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
