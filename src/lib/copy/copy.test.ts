import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { copy } from './index'

const banned = readFileSync('docs/banned-ui-terms.md', 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))

/**
 * Sözlükteki her metni yolu ile birlikte düzleştirir.
 * Fonksiyon değerleri örnek argümanlarla çağrılıp sonuçları da denetlenir —
 * aksi halde şablon metinlerin içindeki teknik terimler gözden kaçardı.
 */
function flatten(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]]
  if (typeof value === 'function') {
    const sample = (value as (...args: string[]) => unknown)('ÖRNEK', 'ÖRNEK', 'ÖRNEK')
    return typeof sample === 'string' ? [[`${path}()`, sample]] : []
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, path ? `${path}.${key}` : key))
  }
  return []
}

describe('metin sözlüğü', () => {
  it('yasaklı terim listesi boş değil', () => {
    expect(banned.length).toBeGreaterThan(0)
  })

  it('yasaklı teknik terim içermez', () => {
    const offenders = flatten(copy)
      .filter(([, text]) => banned.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(text)))
      .map(([path, text]) => `${path}: ${text}`)

    expect(offenders).toEqual([])
  })

  it('her metin dolu bir dizedir', () => {
    for (const [path, text] of flatten(copy)) {
      expect(text.trim(), path).not.toBe('')
    }
  })
})
