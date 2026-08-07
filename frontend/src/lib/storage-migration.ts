/**
 * Migracion de claves de localStorage cannatrack-* -> cultitrack-*.
 *
 * IMPORTANTE: este modulo se importa PRIMERO en main.tsx porque los stores
 * de zustand/persist leen el storage en el momento del import — si la
 * migracion corriera despues, los stores rehidratarian claves vacias y el
 * usuario "perderia" sus datos locales.
 */
const LEGACY_KEYS = ['user', 'weeklogs', 'plants', 'tasks', 'measurements', 'nutrition', 'sync']

for (const key of LEGACY_KEYS) {
  const oldKey = `cannatrack-${key}`
  const newKey = `cultitrack-${key}`
  try {
    const value = localStorage.getItem(oldKey)
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value)
      localStorage.removeItem(oldKey)
    }
  } catch {
    // localStorage inaccesible (SSR/permisos): la app funciona sin migrar
  }
}

export {}
