import { es, enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { useUserStore } from '@/store/userStore'
import type { Language } from '@/i18n'

const LOCALES: Record<Language, Locale> = { es, en: enUS }

/** Locale de date-fns segun el idioma elegido por el usuario (hook). */
export function useDateLocale(): Locale {
  const language = useUserStore((s) => s.language)
  return LOCALES[language] ?? es
}

/** Igual que useDateLocale() pero para codigo fuera de componentes (lib/*.ts). */
export function getDateLocale(): Locale {
  return LOCALES[useUserStore.getState().language] ?? es
}
