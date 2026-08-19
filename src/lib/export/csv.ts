export type CsvValue = string | number | null | undefined

/**
 * Ayraç noktalı virgül, virgül değil.
 *
 * Türkçe yerelde Excel virgülü ondalık ayracı sayar; virgülle ayrılmış
 * bir dosya tek sütuna yapışır. Noktalı virgül Türkçe Excel'in beklediği
 * ayraçtır ve Google E-Tablolar da tanır.
 */
const DELIMITER = ';'

/** Excel satır sonu olarak CRLF bekler. */
const NEWLINE = '\r\n'

const decimal = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, useGrouping: false })

function escape(value: CsvValue): string {
  if (value === null || value === undefined) return ''

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : decimal.format(value)
  }

  /**
   * "=", "+", "-", "@" ile başlayan hücreler Excel'de formül olarak
   * çalışır. Bu değerler Google'dan geliyor, yani bizim denetimimizde
   * değil; kesme işareti ekleyip metin olarak kalmalarını sağlıyoruz.
   */
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value

  return /[";\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
}

export function toCsv(headers: readonly string[], rows: readonly CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(escape).join(DELIMITER)).join(NEWLINE)
}
