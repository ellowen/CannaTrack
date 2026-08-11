import { describe, it, expect } from 'vitest'
import { parseDateOnly, formatDateOnly } from '../date-utils'

describe('parseDateOnly', () => {
  it('parsea una columna date de Postgres como fecha LOCAL, no UTC', () => {
    // Regresion: new Date("2026-08-10") la interpreta el motor JS como
    // medianoche UTC. Para un usuario en un huso horario detras de UTC
    // (ej. America/Argentina/Buenos_Aires, UTC-3), eso corre la fecha un
    // dia hacia atras apenas se lee con getFullYear()/getMonth()/getDate()
    // (hora local), que es como el resto de la app compara fechas.
    const d = parseDateOnly('2026-08-10')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7) // agosto = indice 7
    expect(d.getDate()).toBe(10)
  })

  it('no depende del timezone del entorno donde corre', () => {
    // new Date("YYYY-MM-DD") (sin "T") SIEMPRE da un resultado distinto
    // segun el timezone del proceso cuando se lee con getters locales --
    // parseDateOnly no debe tener esa dependencia.
    const naive = new Date('2026-01-01')
    const fixed = parseDateOnly('2026-01-01')
    // El bug se manifiesta exactamente en este tipo de comparacion: si el
    // entorno de test corre en UTC-algo, naive.getDate() ya da 31 (dic)
    // en vez de 1 (ene). fixed siempre da el dia correcto.
    expect(fixed.getDate()).toBe(1)
    expect(fixed.getMonth()).toBe(0)
    void naive // referencia para no marcar unused en linters estrictos
  })

  it('maneja fechas de fin de mes/año correctamente', () => {
    const d = parseDateOnly('2026-12-31')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
  })

  it('rechaza un timestamp completo en vez de producir un Invalid Date silencioso', () => {
    // Regresion real: un fixture de test que mandaba .toISOString() completo
    // (con "T...Z") en vez de solo fecha producia un Date con getDate()=NaN
    // que pasaba todos los checks truthy y recien explotaba mucho mas
    // adelante en date-fns.format() con "RangeError: Invalid time value",
    // tumbando toda la pantalla sin pista de origen.
    expect(() => parseDateOnly('2026-08-01T14:23:45.123Z')).toThrow()
  })

  it('rechaza un string vacio o no numerico', () => {
    expect(() => parseDateOnly('')).toThrow()
    expect(() => parseDateOnly('no-es-una-fecha')).toThrow()
  })
})

describe('formatDateOnly', () => {
  it('formatea usando componentes LOCALES, no UTC', () => {
    // Regresion: date.toISOString().slice(0, 10) usa componentes UTC. Para
    // un usuario en un huso horario ADELANTE de UTC (ej. Europa/Madrid en
    // horario de invierno, UTC+1) la medianoche local todavia es el dia
    // anterior en UTC, corriendo la fecha un dia hacia atras al persistir
    // en una columna `date` o precargar un <input type="date">.
    const d = new Date(2026, 7, 10) // 10 de agosto, medianoche LOCAL
    expect(formatDateOnly(d)).toBe('2026-08-10')
  })

  it('es la inversa exacta de parseDateOnly (round-trip)', () => {
    const original = '2026-01-05'
    expect(formatDateOnly(parseDateOnly(original))).toBe(original)
  })

  it('rellena con ceros mes y dia de un digito', () => {
    const d = new Date(2026, 0, 5) // 5 de enero
    expect(formatDateOnly(d)).toBe('2026-01-05')
  })
})
