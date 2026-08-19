# Google bağlantısını kurma (bir kerelik)

Uygulamanın Search Console verisini okuyabilmesi için Google tarafında bir
OAuth istemcisi oluşturulmalı. Bu adımlar bir kez yapılır; sonuçta elde edilen
iki değer `.env.local` dosyasına yazılır.

## 1. Proje seç veya oluştur

https://console.cloud.google.com/ → üst çubuktan proje seçici → **New Project**.
Ad önemli değil, örneğin `search-performance`.

## 2. Search Console API'sini etkinleştir

Sol menü → **APIs & Services** → **Library** → arama kutusuna
`Google Search Console API` yaz → **Enable**.

Bu adım atlanırsa site listesi çekilirken izin hatası alınır.

## 3. İzin ekranını yapılandır

**APIs & Services** → **OAuth consent screen**

- **User type:** External (kendi Google hesabınla test edeceksen bu yeterli)
- **App name:** Search Performance
- **User support email** ve **Developer contact:** kendi e-postan
- **Scopes** adımında **Add or remove scopes** → şu kapsamı ekle:

  ```
  https://www.googleapis.com/auth/webmasters.readonly
  ```

  Yalnızca bu kapsam eklenir. Yazma yetkisi istenmez.

- **Test users** adımında kendi Google hesabını ekle. Uygulama
  "Testing" durumundayken yalnızca bu listedeki hesaplar giriş yapabilir.

## 4. OAuth istemcisi oluştur

**APIs & Services** → **Credentials** → **Create Credentials** →
**OAuth client ID**

- **Application type:** Web application
- **Name:** Search Performance (yerel)
- **Authorized redirect URIs** → **ADD URI**:

  ```
  http://localhost:3000/api/auth/callback/google
  ```

  Bu adres birebir aynı olmalı; sonunda eğik çizgi olmamalı. Yanlışsa giriş
  sırasında `redirect_uri_mismatch` hatası alınır.

**Create** dedikten sonra açılan kutuda **Client ID** ve **Client secret**
görünür. İkisini de kopyala.

## 5. Değerleri yaz

Proje kökündeki `.env.local` dosyasında şu iki satırı doldur:

```
GOOGLE_CLIENT_ID=<kopyaladığın client id>
GOOGLE_CLIENT_SECRET=<kopyaladığın client secret>
```

`.env.local` git tarafından yok sayılır; bu değerler depoya girmez.

## 6. Doğrula

```bash
pnpm dev
```

`http://localhost:3000/baglan` adresine git ve **Google Search Console'u Bağla**
düğmesine bas. Google'ın izin ekranı çıkmalı ve onayladıktan sonra
web siteleri listesi görünmeli.

## Sık karşılaşılan iki hata

**`redirect_uri_mismatch`** — 4. adımdaki adres birebir yazılmamış.
Google Cloud Console'daki değerle tarayıcının gittiği adres aynı olmalı.

**`access_denied`** — Google hesabın 3. adımdaki test kullanıcıları listesinde
değil. Listeye ekleyip tekrar dene.

## Üretime çıkarken

Aynı istemciye üretim adresini de eklemek yerine ayrı bir OAuth istemcisi
oluştur ve yönlendirme adresini `https://<alan-adı>/api/auth/callback/google`
olarak ver. İzin ekranını "In production" durumuna almak Google
doğrulamasından geçmeyi gerektirir; `webmasters.readonly` hassas kapsam
sayıldığı için bu süreç birkaç hafta sürebilir.
