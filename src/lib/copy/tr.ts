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

  auth: {
    signInTitle: 'Giriş yapın',
    signUpTitle: 'Hesap oluşturun',
    emailLabel: 'E-posta',
    passwordLabel: 'Parola',
    nameLabel: 'Adınız',
    nameOptional: 'İsteğe bağlı',
    signInAction: 'Giriş Yap',
    signUpAction: 'Hesap Oluştur',
    working: 'Bekleyin...',
    noAccount: 'Hesabınız yok mu?',
    goSignUp: 'Hesap oluşturun',
    haveAccount: 'Zaten hesabınız var mı?',
    goSignIn: 'Giriş yapın',
    wrongCredentials: 'E-posta veya parola hatalı.',
    emailTaken: 'Bu e-posta adresi zaten kayıtlı.',
    emailInvalid: 'Geçerli bir e-posta adresi yazın.',
    signUpNote: 'Hesabınızı oluşturduktan sonra Google Search Console hesaplarınızı bağlayacaksınız.',
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

    preparingTitle: (site: string) => `${site} hazırlanıyor...`,
    preparingAll: 'Web siteleriniz hazırlanıyor...',
    preparingNote: 'Bu birkaç dakika sürebilir. Sayfayı kapatabilirsiniz, hazırlık arka planda devam eder.',
    steps: {
      connecting: 'Google bağlantısı kontrol edildi',
      discovering: 'Web sitesi bulundu',
      fetchingHistory: 'Geçmiş performans verileri alındı',
      ready: 'Dashboard hazır',
    },
    allReady: 'Web siteleriniz hazır.',
    goToDashboard: "Dashboard'a Git",
    technicalDetails: 'Teknik detayları göster',

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

  accounts: {
    pickerLabel: 'Google hesabı seçin',
    all: 'Tüm Hesaplar',
    addAccount: '+ Google Hesabı Ekle',
    siteCount: (count: string) => `${count} site`,
    needsReconnect: 'yenilenmeli',
    sourceAccount: 'Siteleri getirilecek hesap',
  },

  settings: {
    accountHeading: 'Hesabınız',
    connectionHeading: 'Google bağlantınız',
    connectedAs: 'Bağlı hesap',
    connectedSince: 'Bağlandığı tarih',
    connectionActive: 'Bağlantı çalışıyor',
    connectionBroken: 'Bağlantı yenilenmeli',
    noConnection: 'Henüz bir Google hesabı bağlanmamış.',
    reconnect: 'Bağlantıyı Yenile',
    sitesHeading: 'Takip edilen web siteleri',
    removeSite: 'Takibi Bırak',
    removeConfirm: 'Bu web sitesinin verileri silinecek. Devam edilsin mi?',
    noSites: 'Henüz takip ettiğiniz bir web sitesi yok.',
    dangerNote: 'Takibi bıraktığınız sitenin geçmiş verileri silinir. Yeniden eklerseniz veriler baştan alınır.',
    signOutHeading: 'Oturum',
    signOutNote: 'Bu cihazdaki oturumunuz kapatılır. Verileriniz silinmez.',
  },

  reports: {
    heading: 'Verilerinizi indirin',
    intro:
      'Seçili web sitesi ve tarih aralığı için hazırlanmış tabloları indirip Excel veya Google E-Tablolar’da açabilirsiniz.',
    downloadQueries: 'Arama kelimelerini indir',
    downloadPages: 'Sayfaları indir',
    downloadCountries: 'Ülkeleri indir',
    downloadDevices: 'Cihazları indir',
    downloadDaily: 'Günlük özeti indir',
    scopeAllSites: 'Tüm siteler',
    currentScope: 'İndirilecek:',
  },

  dimensions: {
    queriesHeading: 'İnsanlar sizi hangi kelimelerle buluyor?',
    pagesHeading: "Google'dan en çok ziyaret alan sayfalar",
    countriesHeading: 'Ziyaretçileriniz nereden geliyor?',
    devicesHeading: 'Ziyaretçiler hangi cihazları kullanıyor?',
    columns: {
      term: 'Arama',
      page: 'Sayfa',
      views: "Google'da Görünme",
      clicks: 'Tıklama',
      rank: 'Sıra',
      change: 'Değişim',
      share: 'Pay',
    },
    empty: 'Bu dönem için gösterilecek veri yok.',
    seeAll: 'Tümünü gör',
  },

  devices: {
    mobile: 'Mobil',
    desktop: 'Bilgisayar',
    tablet: 'Tablet',
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
