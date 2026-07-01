import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es'
import en from './en'

export type Language = 'es' | 'en'

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Espanol', flag: '🇦🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

export function initI18n(language: Language = 'es') {
  if (i18n.isInitialized) {
    void i18n.changeLanguage(language)
    return
  }
  void i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: language,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })
}

export { i18n }
export { useTranslation } from 'react-i18next'
