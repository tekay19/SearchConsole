import { randomBytes } from 'node:crypto'
import { env } from '@/server/env'

export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export const STATE_COOKIE = 'sp_google_state'
export const STATE_TTL_SECONDS = 600

export type GoogleTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  idToken: string | null
}

export function redirectUri(origin: string): string {
  return `${origin}/api/google/callback`
}

export function newState(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Google'ın izin ekranına giden adres.
 *
 * Bu akış kimlik doğrulama değil, veri kaynağı bağlama. Kullanıcı zaten
 * giriş yapmış durumda; buradan dönen şey "sen kimsin" değil "şu Google
 * hesabının verisini okuma izni".
 *
 * `prompt=consent select_account` ikisi de zorunlu: yenileme jetonu
 * yalnızca izin ekranından geçen akışta geliyor, hesap seçtirmezsek de
 * Google son kullanılan hesapla devam edip kullanıcıya aynı hesabı
 * tekrar bağlatıyor.
 */
export function authorizationUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: `openid email ${SEARCH_CONSOLE_SCOPE}`,
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state,
  })

  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeCode(code: string, origin: string): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(origin),
    }),
  })

  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Google jeton değişimi başarısız (${response.status}).`)

  const { access_token, refresh_token, expires_in, id_token } = payload as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    id_token?: string
  }

  if (!access_token) throw new Error('Google erişim jetonu döndürmedi.')

  return {
    accessToken: access_token,
    refreshToken: refresh_token ?? null,
    expiresAt: new Date(Date.now() + (expires_in ?? 3600) * 1000),
    idToken: id_token ?? null,
  }
}

/**
 * Bağlanan Google hesabının kimliği.
 *
 * `id_token` imzalı bir JWT ama biz doğrulama için kullanmıyoruz — jeton
 * doğrudan Google'dan TLS üzerinden, kendi istemci sırrımızla geldi.
 * Buradaki tek amaç hangi hesabın bağlandığını etiketlemek.
 */
export function readGoogleIdentity(idToken: string | null): { sub: string; email: string } | null {
  const payload = idToken?.split('.')[1]
  if (!payload) return null

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const { sub, email } = decoded as { sub?: unknown; email?: unknown }

    return typeof sub === 'string' && typeof email === 'string' ? { sub, email } : null
  } catch {
    return null
  }
}
