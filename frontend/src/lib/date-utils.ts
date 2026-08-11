/**
 * Parsea una columna PostgreSQL `date` (sin hora/zona, ej: "2026-08-10")
 * como medianoche LOCAL, no UTC.
 *
 * `new Date("2026-08-10")` (sin "T") la interpreta el motor JS como
 * medianoche UTC -- para cualquier usuario en un huso horario detras de
 * UTC (toda America, incluida Argentina UTC-3) eso corre la fecha un dia
 * hacia atras apenas se compara con getFullYear()/getMonth()/getDate()
 * (hora local), que es como el resto de la app lee estas fechas.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  // Fallar ruidoso en vez de devolver un Invalid Date silencioso: un valor
  // mal formado (ej. un timestamp completo en vez de solo fecha) producia
  // antes un Date valido-en-apariencia que recien explotaba mucho mas
  // adelante, en un date-fns.format() sin relacion aparente con el origen
  // real del dato -- un RangeError "Invalid time value" que tumbaba toda
  // la pantalla via el ErrorBoundary, sin pista de donde vino.
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`parseDateOnly: valor invalido "${value}" (esperado YYYY-MM-DD)`)
  }
  return new Date(year, month - 1, day)
}

/**
 * Formatea una fecha como "YYYY-MM-DD" usando sus componentes LOCALES,
 * para persistir en una columna PostgreSQL `date` o precargar un
 * `<input type="date">`.
 *
 * `date.toISOString().slice(0, 10)` usa componentes UTC -- para cualquier
 * usuario en un huso horario ADELANTE de UTC (Europa, Asia, Australia) la
 * medianoche local todavia es el dia anterior en UTC, corriendo la fecha
 * un dia hacia atras.
 */
export function formatDateOnly(date: Date): string {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
