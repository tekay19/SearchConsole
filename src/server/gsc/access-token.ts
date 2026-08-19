import { decryptSecret, encryptSecret } from '@/server/auth/crypto'
import { env } from '@/server/env'
import { connectionsRepo } from '@/server/repositories/connections.repo'
import { GscError } from './errors'
import { createGscClientWithToken, type GscClient } from './client'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** Jetonun ömrü bu süreden azsa şimdiden tazeleriz; istek ortasında sönmesin. */
const REFRESH_MARGIN_MS = 60_000

/**
 * Geçerli bir erişim jetonu döndürür, gerekiyorsa tazeler.
 *
 * Tazelemeyi Auth.js'in oturum akışı değil biz yapıyoruz: veriyi toplayan
 * işçi sürecin tarayıcı oturumu yok, jetona yalnızca veritabanı üzerinden
 * ulaşabiliyor. İki yolun tek bir yerde birleşmesi, arka planın ve arayüzün
 * aynı jetonu paylaşmasını sağlıyor.
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const connection = await connectionsRepo.findById(connectionId)

  if (!connection || connection.revokedAt) {
    throw new GscError('needs_reconnect', 'Google bağlantısı bulunamadı veya iptal edilmiş.')
  }

  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0
  if (connection.accessTokenEncrypted && expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return decryptSecret(connection.accessTokenEncrypted)
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(connection.refreshTokenEncrypted),
    }),
  })

  const payload: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    const reason = (payload as { error?: unknown }).error

    /**
     * invalid_grant tek bir şey anlatır: yenileme jetonu artık geçersiz.
     * Kullanıcı Google tarafından izni geri almış, parolasını değiştirmiş
     * ya da jeton çok uzun süre kullanılmamış olabilir. Hiçbiri yeniden
     * denemekle düzelmez; bağlantıyı iptal işaretleyip kullanıcıdan
     * yeniden bağlanmasını istiyoruz.
     */
    if (reason === 'invalid_grant') {
      await connectionsRepo.markRevoked(connection.id)
      throw new GscError('needs_reconnect', 'Google yenileme jetonunu reddetti.')
    }

    throw new GscError('unavailable', `Google jetonu tazelenemedi (${response.status}).`)
  }

  const { access_token: accessToken, expires_in: expiresIn } = payload as {
    access_token?: string
    expires_in?: number
  }

  if (!accessToken) {
    throw new GscError('unavailable', 'Google geçerli bir erişim jetonu döndürmedi.')
  }

  const newExpiry = new Date(Date.now() + (expiresIn ?? 3600) * 1000)
  await connectionsRepo.saveRefreshedAccessToken(connection.id, encryptSecret(accessToken), newExpiry)

  return accessToken
}

/** Uygulamanın geri kalanı Google'a yalnızca bu kapıdan ulaşır. */
export async function createGscClient(connectionId: string): Promise<GscClient> {
  return createGscClientWithToken(await getAccessToken(connectionId))
}
