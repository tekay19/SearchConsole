import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('başlık satırı ve verileri yazar', () => {
    const csv = toCsv(['Arama', 'Tıklama'], [['iphone', 12]])
    expect(csv.split('\r\n')).toEqual(['Arama;Tıklama', 'iphone;12'])
  })

  it('ayraç olarak noktalı virgül kullanır', () => {
    // Turkce Excel virgulu ondalik ayraci sayiyor; virgullu CSV tek
    // sutuna yapisiyor.
    expect(toCsv(['a', 'b'], [])).toContain(';')
  })

  it('ondalık sayıyı virgüllü yazar', () => {
    expect(toCsv(['Sıra'], [[7.25]])).toContain('7,25')
  })

  it('ayraç içeren metni tırnağa alır', () => {
    expect(toCsv(['Arama'], [['ayakkabı; bot']])).toContain('"ayakkabı; bot"')
  })

  it('tırnak içeren metni kaçırır', () => {
    expect(toCsv(['Arama'], [['12" laptop']])).toContain('"12"" laptop"')
  })

  it('satır sonu içeren metni tırnağa alır', () => {
    expect(toCsv(['Not'], [['bir\niki']])).toContain('"bir\niki"')
  })

  it('boş ve tanımsız değerleri boş bırakır', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]]).split('\r\n')[1]).toBe(';')
  })

  it('formül olarak yorumlanabilecek metni etkisizleştirir', () => {
    // "=" ile baslayan bir hucre Excel'de formul olarak calisir; arama
    // terimi kullanicidan gelmiyor ama Google'dan geldigi icin de
    // guvenilir sayilmaz.
    expect(toCsv(['Arama'], [['=1+1']])).toContain("'=1+1")
  })
})
