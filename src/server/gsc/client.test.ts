import { afterEach, describe, expect, it, vi } from 'vitest'
import { GscError } from './errors'
import { PAGE_SIZE, createGscClientWithToken } from './client'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const fail = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

const client = () => createGscClientWithToken('erisim-jetonu')

const query = (overrides: Partial<Parameters<ReturnType<typeof client>['queryPerformance']>[0]> = {}) =>
  client().queryPerformance({
    property: 'https://example.com/',
    from: '2026-08-01',
    to: '2026-08-02',
    dimensions: ['date'],
    ...overrides,
  })

afterEach(() => vi.restoreAllMocks())

describe('listSites', () => {
  it('yalnızca veri okunabilen siteleri döndürür', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        ok({
          siteEntry: [
            { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
            { siteUrl: 'sc-domain:example.de', permissionLevel: 'siteFullUser' },
            { siteUrl: 'https://gizli.com/', permissionLevel: 'siteUnverifiedUser' },
          ],
        }),
      ),
    )

    await expect(client().listSites()).resolves.toEqual([
      { property: 'https://example.com/', permissionLevel: 'siteOwner' },
      { property: 'sc-domain:example.de', permissionLevel: 'siteFullUser' },
    ])
  })

  it('hiç site yoksa boş dizi verir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({})))
    await expect(client().listSites()).resolves.toEqual([])
  })

  it('erişim jetonunu Authorization başlığında gönderir', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({}))
    vi.stubGlobal('fetch', fetchMock)
    await client().listSites()

    const [, init] = fetchMock.mock.calls[0]!
    expect(init.headers.Authorization).toBe('Bearer erisim-jetonu')
  })
})

describe('queryPerformance', () => {
  it('tüm sayfaları çeker ve birleştirir', async () => {
    const rows = (count: number) =>
      ok({
        rows: Array.from({ length: count }, (_, i) => ({
          keys: [`anahtar-${i}`],
          clicks: 1,
          impressions: 2,
          ctr: 0.5,
          position: 3,
        })),
      })

    const fetchMock = vi.fn().mockResolvedValueOnce(rows(PAGE_SIZE)).mockResolvedValueOnce(rows(10))
    vi.stubGlobal('fetch', fetchMock)

    await expect(query()).resolves.toHaveLength(PAGE_SIZE + 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ikinci sayfayı doğru başlangıç satırından ister', async () => {
    const full = ok({
      rows: Array.from({ length: PAGE_SIZE }, () => ({ keys: ['k'], clicks: 0, impressions: 0, ctr: 0, position: 1 })),
    })
    const fetchMock = vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce(ok({ rows: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await query()

    const secondBody = JSON.parse(fetchMock.mock.calls[1]![1].body)
    expect(secondBody.startRow).toBe(PAGE_SIZE)
  })

  it('yalnızca kesinleşmiş veriyi ister', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ rows: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await query()

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).dataState).toBe('final')
  })

  it('site adresini adres bileşeni olarak kaçırır', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ rows: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await query({ property: 'sc-domain:example.de' })

    expect(fetchMock.mock.calls[0]![0]).toContain('sc-domain%3Aexample.de')
  })

  it('satır dönmezse boş dizi verir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({})))
    await expect(query()).resolves.toEqual([])
  })

  it('yetki hatasını yeniden bağlanma koduyla yükseltir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(401)))
    await expect(query()).rejects.toMatchObject({ code: 'needs_reconnect' })
    await expect(query()).rejects.toBeInstanceOf(GscError)
  })

  it('hız sınırını geçici hata olarak yükseltir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(429)))
    await expect(query()).rejects.toMatchObject({ code: 'rate_limited' })
  })

  it('JSON olmayan hata gövdesinde de anlamlı kod üretir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>bakim</html>', { status: 503 })))
    await expect(query()).rejects.toMatchObject({ code: 'unavailable' })
  })
})
