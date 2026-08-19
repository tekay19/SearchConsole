import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = readFileSync('eslint.config.mjs', 'utf8')

describe('katman sınırları', () => {
  it('repositories katmanı services import edemez', () => {
    expect(config).toContain('src/server/repositories/**')
    expect(config).toContain('@/server/services/*')
  })

  it('lib katmanı server import edemez', () => {
    expect(config).toContain('src/lib/**')
    expect(config).toContain('@/server/*')
  })

  it('arayüzde düz metin yasaktır', () => {
    expect(config).toContain('react/jsx-no-literals')
  })
})
