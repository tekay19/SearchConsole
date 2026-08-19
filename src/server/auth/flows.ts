'use server'

import { signIn } from './index'
import { beginAccountLink } from './link-intent'

/**
 * Google ile giriş.
 *
 * `prompt` verilmiyor: kullanıcı daha önce izin verdiyse Google onu
 * sessizce geri gönderir, izin ekranı çıkmaz. Bu girişte yenileme jetonu
 * gelmeyebilir ve gelmemesi normaldir — kayıtlı olan zaten duruyor.
 */
export async function startSignIn(): Promise<void> {
  await signIn('google', { redirectTo: '/genel-bakis' })
}

/**
 * Yeni bir Google hesabı bağlama.
 *
 * Burada `prompt` zorunlu ve iki değer birden taşıyor:
 *
 * - `select_account`: Google varsayılan olarak son kullanılan hesapla
 *   devam eder; hesap seçtirmezsek kullanıcı aynı hesabı tekrar bağlar
 *   ve neden bir şey değişmediğini anlamaz.
 * - `consent`: yenileme jetonu yalnızca izin ekranından geçen akışta
 *   gelir. Onsuz yeni hesabın verisi arka planda hiç toplanamaz.
 */
export async function startAccountLink(userId: string): Promise<void> {
  await beginAccountLink(userId)

  await signIn(
    'google',
    { redirectTo: '/siteler/sec' },
    { prompt: 'consent select_account', access_type: 'offline' },
  )
}
