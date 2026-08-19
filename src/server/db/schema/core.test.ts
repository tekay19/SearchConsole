import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { googleConnections, siteSyncState, sites, users } from './core'

describe('çekirdek şema', () => {
  it('kullanıcı e-postası tekildir', () => {
    const email = getTableConfig(users).columns.find((column) => column.name === 'email')
    expect(email?.isUnique).toBe(true)
  })

  it('aynı kullanıcı aynı web sitesini iki kez ekleyemez', () => {
    const { uniqueConstraints } = getTableConfig(sites)
    const columns = uniqueConstraints.flatMap((constraint) => constraint.columns.map((column) => column.name))
    expect(columns).toEqual(expect.arrayContaining(['user_id', 'gsc_property']))
  })

  it('aynı kullanıcı aynı Google hesabını iki kez bağlayamaz', () => {
    const { uniqueConstraints } = getTableConfig(googleConnections)
    const columns = uniqueConstraints.flatMap((constraint) => constraint.columns.map((column) => column.name))
    expect(columns).toEqual(expect.arrayContaining(['user_id', 'google_sub']))
  })

  it('gizli değerler yalnızca şifreli sütunlarda saklanır', () => {
    const names = getTableConfig(googleConnections).columns.map((column) => column.name)
    expect(names).toContain('refresh_token_encrypted')
    expect(names).toContain('access_token_encrypted')
    expect(names).not.toContain('refresh_token')
    expect(names).not.toContain('access_token')
  })

  it('yenileme jetonu zorunludur; onsuz arka planda veri toplanamaz', () => {
    const column = getTableConfig(googleConnections).columns.find(
      (candidate) => candidate.name === 'refresh_token_encrypted',
    )
    expect(column?.notNull).toBe(true)
  })

  it('senkron durumu her web sitesi için tekildir', () => {
    const { columns } = getTableConfig(siteSyncState)
    const siteId = columns.find((column) => column.name === 'site_id')
    expect(siteId?.primary).toBe(true)
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['stage', 'last_synced_date', 'consecutive_failures', 'last_error_code']),
    )
  })

  it('yeni web sitesi hazırlanıyor durumunda başlar', () => {
    const status = getTableConfig(sites).columns.find((column) => column.name === 'status')
    expect(status?.default).toBe('syncing')
  })
})
