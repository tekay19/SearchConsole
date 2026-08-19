import { copy } from '@/lib/copy'

/**
 * Sol menü. Sıra Spec §5.11 ile birebir: önce genel bakış, sonra siteler,
 * sonra kırılımlar, en sonda raporlar ve ayarlar.
 */
export const NAV_ITEMS = [
  { href: '/genel-bakis', label: copy.nav.overview },
  { href: '/sitelerim', label: copy.nav.sites },
  { href: '/arama-kelimeleri', label: copy.nav.searchTerms },
  { href: '/sayfalar', label: copy.nav.pages },
  { href: '/ulkeler', label: copy.nav.countries },
  { href: '/cihazlar', label: copy.nav.devices },
  { href: '/raporlar', label: copy.nav.reports },
  { href: '/ayarlar', label: copy.nav.settings },
] as const
