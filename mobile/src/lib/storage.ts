import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Reviver de JSON para rehidratar fechas ISO serializadas como strings.
 * Valida que las fechas sean válidas antes de crear objetos Date.
 */
export const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    console.error(`Invalid ISO date detected: ${value}`)
    return value
  }
  return date
}

/**
 * Storage adapter para Zustand persist middleware usando AsyncStorage.
 * Maneja serialización/deserialización automática de Dates.
 */
export const createAsyncStorage = () => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name)
      return value ? JSON.parse(value, dateReviver) : null
    } catch (error) {
      console.error(`Failed to get item ${name}:`, error)
      return null
    }
  },
  setItem: async (name: string, value: unknown) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to set item ${name}:`, error)
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name)
    } catch (error) {
      console.error(`Failed to remove item ${name}:`, error)
    }
  },
})
