import { describe, expect, it } from 'vitest'
import {
  ALL_ACCOUNTS,
  ALL_SITES,
  DEFAULT_RANGE,
  buildDashboardHref,
  parseDashboardParams,
} from './search-params'

describe('parseDashboardParams', () => {
  it('varsayılan olarak tüm hesaplar, tüm siteler ve son 28 gün seçilir', () => {
    expect(parseDashboardParams({})).toEqual({
      siteId: ALL_SITES,
      accountId: ALL_ACCOUNTS,
      range: DEFAULT_RANGE,
    })
    expect(DEFAULT_RANGE).toBe('28d')
  })

  it('geçerli değerleri okur', () => {
    expect(parseDashboardParams({ site: 'abc', hesap: 'acc-1', aralik: '7d' })).toEqual({
      siteId: 'abc',
      accountId: 'acc-1',
      range: '7d',
    })
  })

  it('hesap seçimini okur', () => {
    expect(parseDashboardParams({ hesap: 'acc-9' }).accountId).toBe('acc-9')
  })

  it('bilinmeyen aralığı varsayılana çevirir', () => {
    // Adres cubuguna elle bir sey yazan kullanici hata ekrani gormemeli.
    expect(parseDashboardParams({ aralik: 'hepsi' }).range).toBe(DEFAULT_RANGE)
  })

  it('dizi gelen parametrede ilk değeri alır', () => {
    expect(parseDashboardParams({ aralik: ['7d', '3m'] }).range).toBe('7d')
  })
})

describe('buildDashboardHref', () => {
  it('yalnızca verilen parametreleri yazar', () => {
    expect(buildDashboardHref('/genel-bakis', { range: '3m' })).toBe('/genel-bakis?aralik=3m')
  })

  it('tüm siteler seçiliyken site parametresini yazmaz', () => {
    // Varsayilan degeri adreste tasimak baglantiyi gereksiz uzatir.
    expect(buildDashboardHref('/genel-bakis', { siteId: ALL_SITES, range: '7d' })).toBe('/genel-bakis?aralik=7d')
  })

  it('site ve aralığı birlikte yazar', () => {
    expect(buildDashboardHref('/sitelerim', { siteId: 'abc', range: '7d' })).toBe('/sitelerim?site=abc&aralik=7d')
  })

  it('hesabı site ve aralıkla birlikte yazar', () => {
    expect(buildDashboardHref('/genel-bakis', { accountId: 'acc-1', siteId: 'abc', range: '7d' })).toBe(
      '/genel-bakis?hesap=acc-1&site=abc&aralik=7d',
    )
  })

  it('tüm hesaplar seçiliyken hesap parametresini yazmaz', () => {
    expect(buildDashboardHref('/genel-bakis', { accountId: ALL_ACCOUNTS, range: '7d' })).toBe(
      '/genel-bakis?aralik=7d',
    )
  })

  it('hiçbir parametre yoksa düz yol döner', () => {
    expect(buildDashboardHref('/genel-bakis', {})).toBe('/genel-bakis')
  })
})
