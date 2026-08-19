import { tr } from './tr'

/**
 * Tek dil (Türkçe) ile başlıyoruz. İkinci dil gerektiğinde buraya bir seçim
 * eklenir; bileşenler `copy` üzerinden okuduğu için hiçbiri değişmez.
 */
export const copy = tr

export type Copy = typeof tr
