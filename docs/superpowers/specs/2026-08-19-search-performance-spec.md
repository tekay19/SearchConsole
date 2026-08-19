# Search Performance — Ürün Spec'i

**Tarih:** 2026-08-19
**Durum:** Onaylı (kullanıcı UX yönlendirmesinden türetildi)

---

## 1. Tek cümlelik tanım

Kullanıcının Google Search Console verilerini, hiçbir teknik terim görmeden,
"ne oldu / neden önemli / ne yapmalıyım" sorularına cevap veren tek bir panelden
takip etmesini sağlayan çok-siteli performans dashboard'u.

## 2. Hedef kullanıcı

- **Birincil:** Teknik olmayan yönetici / işletme sahibi. SEO bilmez, API bilmez.
  10 saniyede ekranı anlamalı.
- **İkincil:** SEO bilen kişi. Aynı ekranlardan detaya inebilmeli.

Tasarım kuralı: **Birincil kullanıcı için tasarla, ikincil kullanıcıya derinlik
bırak.** Detay hep bir tık arkada olur, ama ana ekranı kirletmez.

## 3. Ana kullanıcı akışı

```
1. Google hesabını bağla
        ↓
2. Web sitelerini seç
        ↓
3. Veriler otomatik gelsin
        ↓
4. Sitelerin performansını gör
```

Backend'de OAuth, API çağrısı, kuyruk, cron, veritabanı çalışır.
**Kullanıcı bunların hiçbirini bilmek zorunda değildir.**

## 4. Dil kuralları (zorunlu)

### 4.1 Yasaklı kelimeler (arayüzde asla görünmez)

```
Property, OAuth, API, Token, Cron, Dimension, Metric, Metrics,
Query, Queries, Endpoint, Sync, Worker, Search Analytics API,
Impression, Impressions, CTR, Backfill, Job, Quota, Webhook,
Payload, Refresh Token, Scope, Rate Limit
```

Bu liste `docs/banned-ui-terms.md` içinde tek kaynak olarak tutulur ve otomatik
testle denetlenir. Yeni terim eklemek dosyaya satır eklemekten ibarettir.

### 4.2 Zorunlu karşılıklar

| Teknik kavram        | Arayüzde görünen           |
| -------------------- | -------------------------- |
| Property             | Web sitesi                 |
| OAuth / yetkilendirme| Google hesabınızı bağlayın |
| Impressions          | Google'da Görüntülenme     |
| CTR                  | Tıklama Oranı              |
| Average position     | Ortalama Google Sırası     |
| Queries              | Arama Kelimeleri           |
| Pages                | En İyi Sayfalar            |
| Sync / job           | Verileri güncelle          |
| Token expired        | Google bağlantınızı yenilemeniz gerekiyor |
| Devices: Desktop     | Bilgisayar                 |
| Devices: Mobile      | Mobil                      |
| Devices: Tablet      | Tablet                     |

### 4.3 Sayı ve tarih biçimi

Tümü `tr-TR`: `128.420`, `%3,0`, `8,4`, `Bugün 13:42`.

## 5. Ekranlar

### 5.1 İlk giriş (boş durum)

```
Search Performance
Web sitelerinizin Google performansını tek ekrandan takip edin.

[ Google Search Console'u Bağla ]

Google hesabınızdan yalnızca Search Console performans verileri okunur.
```

### 5.2 Site seçimi

Bağlantı sonrası bulunan web siteleri çoklu seçim listesi olarak gösterilir.
"4 web sitesi bulundu." + `[ Seçilen Siteleri Ekle ]`.

### 5.3 Hazırlanıyor ekranı

İnsan diliyle 4 adım, sırayla tikleniyor:

```
example.com hazırlanıyor...
✓ Google bağlantısı kontrol edildi
✓ Web sitesi bulundu
✓ Geçmiş performans verileri alındı
✓ Dashboard hazır
[ Dashboard'a Git ]
```

Ham log **gösterilmez**; `Teknik detayları göster` katlanır alanının içinde kalır.

### 5.4 Genel Bakış (ana dashboard)

- Site seçici (`Tüm Siteler` dahil) + tarih aralığı seçici (Son 7 / 28 Gün / 3 Ay / Tarih Seç)
- 4 KPI kartı: Tıklamalar, Google'da Görüntülenme, Tıklama Oranı, Ortalama Google Sırası
  - Her kartta bir önceki eşit uzunlukta döneme göre değişim
  - Her kartta `?` → sade açıklama tooltip'i
- Performans grafiği: Tıklamalar / Görüntülenmeler geçiş sekmeleri
- **Bugün dikkat etmeniz gerekenler** — durum özeti listesi

### 5.5 Web Sitelerim

Arama kutusu + kart/tablo görünüm geçişi. Her kartta: tıklama, görüntülenme,
değişim yüzdesi, "Son veri: Bugün 13:42", durum rozeti, `[ Detayları Gör ]`.

### 5.6 Site detayı

Üstte site adı, son veri zamanı, tarih aralığı butonları; altında 4 metrik;
sonra arama kelimeleri, sayfalar, ülkeler, cihazlar bölümleri.

### 5.7 Arama Kelimeleri

Başlık: **"İnsanlar sizi hangi kelimelerle buluyor?"**
Sütunlar: Arama | Google'da Görünme | Tıklama | Sıra
Satıra tıklayınca yan panelde kelime detayı (dönem karşılaştırmalı).

### 5.8 En İyi Sayfalar

Başlık: **"Google'dan en çok ziyaret alan sayfalar"**
Mümkünse sayfa başlığı + altında yol (`/iphone-15-pro`).

### 5.9 Ülkeler

Başlık: **"Ziyaretçileriniz nereden geliyor?"** — ülke adı, tıklama, yüzde payı.

### 5.10 Cihazlar

Başlık: **"Ziyaretçiler hangi cihazları kullanıyor?"** — Mobil / Bilgisayar / Tablet + yüzde.

### 5.11 Sidebar

```
Genel Bakış · Web Sitelerim · Arama Kelimeleri · En İyi Sayfalar
Ülkeler · Cihazlar · Raporlar · Ayarlar
```

## 6. Durum özeti ("Bugün dikkat etmeniz gerekenler")

Sistem sadece sayı göstermez, yorum üretir. Üretilecek içgörü tipleri:

| Tip                   | Örnek çıktı |
| --------------------- | ----------- |
| `clicks_change`       | example.de tıklamaları %24 arttı. |
| `position_change`     | example.es Google sıralaması 6,2'den 11,8'e düştü. |
| `query_breakout`      | "iphone kaufen" kelimesi ilk 3 sıraya yükseldi. |
| `stale_data`          | shop.example.com için 2 gündür yeni veri gelmiyor. |
| `needs_reconnect`     | example.com için Google bağlantınızı yenilemeniz gerekiyor. |

Her içgörünün yönü (`up` / `down` / `warning`) ve tıklanınca gideceği bir hedef
ekranı vardır.

## 7. Site durumları

Kullanıcıya yalnız şu dört durum gösterilir:

| İç durum          | Kullanıcı görür        | Aksiyon |
| ----------------- | ---------------------- | ------- |
| `fresh`           | ● Güncel               | — |
| `syncing`         | ● Veri alınıyor        | — |
| `needs_reconnect` | ● Bağlantı gerekli     | `[ Bağlantıyı Yenile ]` |
| `failed`          | ● Veri alınamadı       | `[ Tekrar Dene ]` |

Hata kodu, HTTP durumu, istisna mesajı **hiçbir zaman** kullanıcıya gösterilmez.

## 8. Her ekranın geçmesi gereken üç soru testi

1. **Ne oldu?** → "Tıklamalar %18 arttı."
2. **Neden önemli?** → "Google'dan daha fazla ziyaretçi geliyor."
3. **Ne yapmam gerekiyor?** → "example.es sıralamasını inceleyin."

Bir ekran bu üçünden birine cevap veremiyorsa eksiktir.

## 9. Kapsam dışı (v1'de yok)

- Ekip / çoklu kullanıcı, rol yönetimi
- E-posta ile rapor gönderimi (Raporlar ekranı v1'de sadece ekran içi dışa aktarım)
- Google Analytics entegrasyonu
- Çoklu dil (yalnızca Türkçe, ama yapı dil değişimine hazır)
- Ücretlendirme / abonelik

## 10. Ölçek varsayımları

| Boyut | v1 hedefi | Tasarımın kırılmaması gereken sınır |
| ----- | --------- | ---------------------------------- |
| Kullanıcı başına site | 5–50 | 500 |
| Sistemdeki toplam site | 1.000 | 50.000 |
| Site başına geçmiş veri | 16 ay | 16 ay (Google sınırı) |
| Site başına günlük arama kelimesi satırı | ~1.000 | 25.000 |
| Günlük yazılan satır (1.000 site) | ~2M | ~20M |

Bu sayılar veri modeli (aylık bölümlenmiş tablolar) ve senkron mimarisi
(kuyruk + hız sınırlayıcı) kararlarının gerekçesidir.
