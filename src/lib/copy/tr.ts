/**
 * Kullanıcıya görünen TÜM metinler burada yaşar.
 *
 * Kural: teknik terim yok. Yasaklı liste docs/banned-ui-terms.md içindedir
 * ve copy.test.ts tarafından denetlenir. Bileşenlerde düz metin yazmak
 * ESLint hatasıdır (react/jsx-no-literals), böylece hiçbir metin bu
 * denetimin etrafından dolaşamaz.
 *
 * Sayı ve tarih biçimlendirmesi buraya girmez; onu src/lib/format yapar.
 */
export const tr = {
  app: {
    name: 'Search Performance',
    tagline: 'Web sitelerinizin Google performansını tek ekrandan takip edin.',
  },

  nav: {
    overview: 'Genel Bakış',
    sites: 'Web Sitelerim',
    searchTerms: 'Arama Kelimeleri',
    pages: 'En İyi Sayfalar',
    countries: 'Ülkeler',
    devices: 'Cihazlar',
    reports: 'Raporlar',
    settings: 'Ayarlar',
  },

  metrics: {
    clicks: {
      label: 'Tıklamalar',
      help: 'Google arama sonuçlarından sitenize gelen ziyaret sayısı.',
    },
    views: {
      label: "Google'da Görüntülenme",
      help: "Google'daki arama sonuçlarında sitenizin kaç kez gösterildiği.",
    },
    clickRate: {
      label: 'Tıklama Oranı',
      help: "Google'da sitenizi gören her 100 kişiden kaçının sitenize girdiği.",
    },
    rank: {
      label: 'Ortalama Google Sırası',
      help: 'Sitenizin Google sonuçlarında ortalama kaçıncı sırada göründüğü. Küçük sayı daha iyidir.',
    },
  },

  onboarding: {
    ladderCaption: 'Sizin siteniz',
    headline: 'Google’da kaçıncı sıradasınız?',
    subhead:
      'Sitelerinizin Google aramalarında nerede çıktığını, kaç kişinin tıkladığını ve bunun her hafta nasıl değiştiğini tek ekrandan görün.',
    connectAction: "Google Search Console'u Bağla",
    connectNote: 'Google hesabınızdan yalnızca Search Console performans verileri okunur.',
    connectFailed: 'Bağlantı tamamlanamadı. Lütfen tekrar deneyin.',
    accessDenied: 'Google izni verilmedi. Verilerinizi görebilmemiz için izin vermeniz gerekiyor.',
  },

  status: {
    fresh: 'Güncel',
    syncing: 'Veri alınıyor',
    needsReconnect: 'Bağlantı gerekli',
    failed: 'Veri alınamadı',
    reconnectMessage: 'Google bağlantınızı yenilemeniz gerekiyor.',
    reconnectAction: 'Bağlantıyı Yenile',
    failedMessage: 'Bu web sitesinin verilerini şu an alamıyoruz. Birazdan tekrar deneyebilirsiniz.',
    retryAction: 'Tekrar Dene',
  },
} as const
