/**
 * Reviver de JSON para rehidratar fechas ISO serializadas como strings.
 * Usar como segundo argumento de JSON.parse en los stores de Zustand.
 */
export const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }
  return value
}
