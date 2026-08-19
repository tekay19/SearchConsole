import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { STATE_COOKIE, exchangeCode } from '@/server/gsc/oauth'
import { accountsService } from '@/server/services/accounts.service'

const fail = (request: Request, reason: string) =>
  NextResponse.redirect(new URL(`/ayarlar?baglanti=${reason}`, request.url))

/**
 * Google'dan dönüş.
 *
 * Buradan çıkan sonuç yalnızca "yeni bir veri kaynağı bağlandı" olur;
 * oturuma dokunulmaz. Kimlik e-posta/parola ile kurulduğu için kullanıcı
 * kaç hesap bağlarsa bağlasın kim olduğu değişmez.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth()
  if (!session?.userId) return NextResponse.redirect(new URL('/giris', request.url))

  const url = new URL(request.url)
  const store = await cookies()

  const expectedState = store.get(STATE_COOKIE)?.value
  store.delete(STATE_COOKIE)

  // CSRF koruması: Google'ın geri getirdiği state bizim yazdığımızla
  // eşleşmezse bu dönüş bizim başlattığımız akış değildir.
  const state = url.searchParams.get('state')
  if (!expectedState || state !== expectedState) return fail(request, 'gecersiz')

  // Kullanıcı izin ekranında vazgeçmiş olabilir; bu bir hata değil.
  if (url.searchParams.get('error')) return fail(request, 'iptal')

  const code = url.searchParams.get('code')
  if (!code) return fail(request, 'eksik')

  try {
    const tokens = await exchangeCode(code, url.origin)
    const { ok } = await accountsService.connectFromGoogle(session.userId, tokens)

    if (!ok) return fail(request, 'kimliksiz')
  } catch (error) {
    // Ayrıntı sunucu günlüğünde kalır; kullanıcıya kod göstermeyiz.
    console.error('[google-connect]', error instanceof Error ? error.message : error)
    return fail(request, 'basarisiz')
  }

  return NextResponse.redirect(new URL('/siteler/sec', request.url))
}
