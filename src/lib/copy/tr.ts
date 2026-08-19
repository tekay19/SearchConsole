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
    connectedTitle: 'Google hesabınız bağlandı',
    selectTitle: 'Takip etmek istediğiniz web sitelerini seçin.',
    foundCount: (count: string) => `${count} web sitesi bulundu.`,
    alreadyAdded: 'Zaten takip ediliyor',
    addAction: 'Seçilen Siteleri Ekle',
    adding: 'Ekleniyor...',
    skipAction: 'Şimdilik geç',
    nothingFound: 'Google hesabınızda takip edebileceğimiz bir web sitesi bulamadık.',
    nothingFoundHelp:
      'Search Console’da doğrulanmış bir siteniz olması gerekiyor. Doğruladıktan sonra bu sayfayı yenileyin.',
    selectAtLeastOne: 'Devam etmek için en az bir web sitesi seçin.',

    ladderCaption: 'Sizin siteniz',
    headline: 'Google’da kaçıncı sıradasınız?',
    subhead:
      'Sitelerinizin Google aramalarında nerede çıktığını, kaç kişinin tıkladığını ve bunun her hafta nasıl değiştiğini tek ekrandan görün.',
    connectAction: "Google Search Console'u Bağla",
    connectNote: 'Google hesabınızdan yalnızca Search Console performans verileri okunur.',
    connectFailed: 'Bağlantı tamamlanamadı. Lütfen tekrar deneyin.',
    accessDenied: 'Google izni verilmedi. Verilerinizi görebilmemiz için izin vermeniz gerekiyor.',
  },

  filters: {
    allSites: 'Tüm Siteler',
    sitePickerLabel: 'Web sitesi seçin',
    rangeLabel: 'Tarih aralığı',
    ranges: {
      '7d': 'Son 7 Gün',
      '28d': 'Son 28 Gün',
      '3m': 'Son 3 Ay',
    },
  },

  sites: {
    addAction: 'Site Ekle',
    searchPlaceholder: 'Web sitesi arayın',
    searchLabel: 'Web sitelerinde ara',
    detailAction: 'Detayları Gör',
    lastData: 'Son veri:',
    neverSynced: 'Henüz veri alınmadı',
    viewCards: 'Kartlar',
    viewTable: 'Tablo',
    viewLabel: 'Görünüm',
    empty: 'Henüz takip ettiğiniz bir web sitesi yok.',
    emptyAction: 'Web sitesi ekleyin',
    noMatch: 'Aramanıza uyan web sitesi yok.',
  },

  chart: {
    title: 'Google Performansı',
    empty: 'Bu dönem için henüz veri yok.',
    seriesLabel: 'Gösterilecek ölçü',
  },

  delta: {
    increased: 'Geçen döneme göre arttı',
    decreased: 'Geçen döneme göre azaldı',
    improved: 'Geçen döneme göre iyileşti',
    worsened: 'Geçen döneme göre geriledi',
    unchanged: 'Geçen döneme göre değişmedi',
    noComparison: 'Karşılaştırma için yeterli geçmiş veri yok',
  },

  /** Bir kez burada tanımlanır; sonraki bölümler yalnızca satır ekler. */
  common: {
    noData: '—',
    helpLabel: 'Bu nedir?',
    other: 'Diğer',
    comingSoon: 'Bu bölüm yakında kullanıma açılacak.',
    signOut: 'Çıkış Yap',
    mainNavLabel: 'Ana menü',
  },

  /**
   * Durum özeti cümleleri. Sayı biçimlendirmesi çağıran tarafta yapılır;
   * buraya hazır metin gelir.
   */
  insights: {
    title: 'Bugün dikkat etmeniz gerekenler',
    empty: 'Şu an dikkatinizi gerektiren bir durum yok.',
    needsReconnect: (site: string) => `${site} için Google bağlantınızı yenilemeniz gerekiyor.`,
    staleData: (site: string, days: string) => `${site} için ${days} gündür yeni veri gelmiyor.`,
    clicksUp: (site: string, change: string) => `${site} tıklamaları ${change} arttı.`,
    clicksDown: (site: string, change: string) => `${site} tıklamaları ${change} azaldı.`,
    rankUp: (site: string, from: string, to: string) =>
      `${site} Google sıralaması ${from}'ten ${to}'e yükseldi.`,
    rankDown: (site: string, from: string, to: string) =>
      `${site} Google sıralaması ${from}'ten ${to}'e geriledi.`,
    queryBreakout: (query: string) => `"${query}" kelimesi ilk 3 sıraya yükseldi.`,
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
