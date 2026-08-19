import { describe, expect, it } from 'vitest'
import { countryLabel, deviceLabel, pagePath } from './labels'

describe('deviceLabel', () => {
  it('cihazları Türkçeye çevirir', () => {
    expect(deviceLabel('MOBILE')).toBe('Mobil')
    expect(deviceLabel('DESKTOP')).toBe('Bilgisayar')
    expect(deviceLabel('TABLET')).toBe('Tablet')
  })

  it('küçük harfli değeri de tanır', () => {
    expect(deviceLabel('mobile')).toBe('Mobil')
  })

  it('bilinmeyen cihaz için ham değeri sızdırmaz', () => {
    expect(deviceLabel('SMART_TV')).toBe('Diğer')
  })
})

describe('countryLabel', () => {
  it('üç harfli kodu Türkçe ülke adına çevirir', () => {
    // Google "deu" donduruyor; kullaniciya "Almanya" gostermeliyiz.
    expect(countryLabel('deu')).toBe('Almanya')
    expect(countryLabel('tur')).toBe('Türkiye')
    expect(countryLabel('aut')).toBe('Avusturya')
    expect(countryLabel('swe')).toBe('İsveç')
    expect(countryLabel('ita')).toBe('İtalya')
    expect(countryLabel('esp')).toBe('İspanya')
  })

  it('büyük harfli kodu da tanır', () => {
    expect(countryLabel('DEU')).toBe('Almanya')
  })

  it('bilinmeyen kod için ham kodu göstermez', () => {
    expect(countryLabel('zzz')).toBe('Diğer')
    expect(countryLabel('')).toBe('Diğer')
  })
})

describe('pagePath', () => {
  it('alan adını kırpar', () => {
    expect(pagePath('https://example.com/urun/iphone-15')).toBe('/urun/iphone-15')
  })

  it('ana sayfayı eğik çizgi olarak gösterir', () => {
    expect(pagePath('https://example.com/')).toBe('/')
  })

  it('sorgu ve çapa bölümünü korur', () => {
    expect(pagePath('https://example.com/ara?q=test')).toBe('/ara?q=test')
  })

  it('adres olmayan değeri olduğu gibi bırakır', () => {
    expect(pagePath('tuhaf-deger')).toBe('tuhaf-deger')
  })
})
