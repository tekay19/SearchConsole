import { beforeEach, describe, expect, it, vi } from 'vitest'

const listSites = vi.fn()
const insertMany = vi.fn()
const listForUser = vi.fn()
const startHistorySync = vi.fn()

vi.mock('@/server/gsc/access-token', () => ({
  createGscClient: vi.fn(async () => ({ listSites, queryPerformance: vi.fn() })),
}))

vi.mock('@/server/repositories/sites.repo', () => ({
  sitesRepo: { insertMany, listForUser },
}))

vi.mock('@/server/sync/history-sync', () => ({ startHistorySync }))

const { onboardingService, toDisplayName } = await import('./onboarding.service')

beforeEach(() => {
  vi.clearAllMocks()
  listForUser.mockResolvedValue([{ gscProperty: 'sc-domain:example.com' }])
  insertMany.mockResolvedValue([])
})

describe('toDisplayName', () => {
  it('alan adı biçimindeki ön eki kaldırır', () => {
    // Kullanici "sc-domain:" gormemeli; spec'in yasakladigi jargon.
    expect(toDisplayName('sc-domain:example.com')).toBe('example.com')
  })

  it('adres biçimindeki siteyi alan adına indirger', () => {
    expect(toDisplayName('https://example.de/')).toBe('example.de')
    expect(toDisplayName('https://shop.example.de/magaza/')).toBe('shop.example.de')
  })

  it('www ön ekini kaldırır', () => {
    expect(toDisplayName('https://www.example.com/')).toBe('example.com')
  })

  it('tanımadığı biçimi olduğu gibi bırakır', () => {
    expect(toDisplayName('tuhaf-deger')).toBe('tuhaf-deger')
  })
})

describe('discoverSites', () => {
  it('zaten eklenmiş siteleri işaretler', async () => {
    listSites.mockResolvedValue([
      { property: 'sc-domain:example.com', permissionLevel: 'siteOwner' },
      { property: 'sc-domain:example.de', permissionLevel: 'siteOwner' },
    ])

    await expect(onboardingService.discoverSites('user-1', 'conn-1')).resolves.toEqual([
      { property: 'sc-domain:example.com', displayName: 'example.com', alreadyAdded: true },
      { property: 'sc-domain:example.de', displayName: 'example.de', alreadyAdded: false },
    ])
  })

  it('siteleri okunabilir ada göre sıralar', async () => {
    listSites.mockResolvedValue([
      { property: 'sc-domain:zebra.com', permissionLevel: 'siteOwner' },
      { property: 'sc-domain:alfa.com', permissionLevel: 'siteOwner' },
    ])

    const names = (await onboardingService.discoverSites('user-1', 'conn-1')).map((site) => site.displayName)
    expect(names).toEqual(['alfa.com', 'zebra.com'])
  })
})

describe('addSites', () => {
  it('eklenen her site için geçmiş veri toplamayı başlatır', async () => {
    insertMany.mockResolvedValue([
      { id: 'site-1', displayName: 'a.com' },
      { id: 'site-2', displayName: 'b.com' },
    ])
    listSites.mockResolvedValue([
      { property: 'sc-domain:a.com', permissionLevel: 'siteOwner' },
      { property: 'sc-domain:b.com', permissionLevel: 'siteOwner' },
    ])

    await onboardingService.addSites('user-1', 'conn-1', ['sc-domain:a.com', 'sc-domain:b.com'])

    expect(startHistorySync).toHaveBeenCalledTimes(2)
  })

  it('boş seçimde Google’a hiç gitmez', async () => {
    await onboardingService.addSites('user-1', 'conn-1', [])
    expect(listSites).not.toHaveBeenCalled()
    expect(startHistorySync).not.toHaveBeenCalled()
  })

  it('Google’da olmayan bir adresi eklemez', async () => {
    // Formdan gelen deger guvenilmez; yetkisi olmayan bir siteyi
    // eklemeye calisan istek sessizce bos donmeli.
    listSites.mockResolvedValue([{ property: 'sc-domain:a.com', permissionLevel: 'siteOwner' }])

    await onboardingService.addSites('user-1', 'conn-1', ['sc-domain:baskasinin-sitesi.com'])

    expect(insertMany).toHaveBeenCalledWith([])
  })
})
