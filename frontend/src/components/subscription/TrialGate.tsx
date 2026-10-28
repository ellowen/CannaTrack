import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { LogoMark } from '@/components/ui'

/**
 * Banner de aviso cuando la prueba esta por vencer (<= 7 dias).
 * Se muestra arriba del contenido en todas las pantallas de la app.
 */
export function TrialBanner() {
  const { t } = useTranslation()
  const { showTrialWarning, trialDaysLeft } = useSubscription()

  if (!showTrialWarning) return null

  return (
    <div
      role="status"
      className="mx-4 mt-3 bg-flora-bg border border-flora-border rounded-2xl px-4 py-2.5 flex items-center gap-3"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-flora-text" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
      <p className="text-xs text-flora-text font-semibold flex-1 min-w-0">
        {trialDaysLeft === 1
          ? t('subscription.trial_last_day')
          : t('subscription.trial_days_left', { days: trialDaysLeft })}
      </p>
    </div>
  )
}

/**
 * Pantalla de bloqueo cuando el periodo de prueba vencio y el usuario
 * no tiene suscripcion. Reemplaza al contenido de la app.
 * El CTA de pago es un placeholder: cuando se integre Stripe/MercadoPago
 * solo hay que cambiar el onClick — la arquitectura (profiles.is_pro +
 * tabla subscriptions via webhook) ya esta preparada.
 */
export function TrialExpired() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-5"><LogoMark size={64} /></div>
      <h1 className="text-3xl text-ink-1 mb-2">{t('subscription.expired_title')}</h1>
      <p className="text-sm text-ink-3 leading-relaxed max-w-sm mb-6">
        {t('subscription.expired_desc')}
      </p>

      <div className="w-full max-w-sm glass-card rounded-2xl p-5 mb-4 text-left">
        <p className="text-sm font-bold text-ink-1 mb-3">{t('subscription.pro_plan_title')}</p>
        <ul className="space-y-2 text-xs text-ink-2">
          {['pro_feature_unlimited', 'pro_feature_tables', 'pro_feature_photos', 'pro_feature_history'].map((k) => (
            <li key={k} className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="w-3.5 h-3.5 shrink-0 text-brand-400" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t(`subscription.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="mailto:cultitrack@gmail.com?subject=Quiero%20suscribirme%20a%20CultiTrack"
        className="w-full max-w-sm py-3.5 rounded-2xl bg-brand-400 text-brand-on font-bold text-sm text-center tap-highlight-none active:scale-[0.98] transition-all"
      >
        {t('subscription.subscribe_cta')}
      </a>
      <p className="text-[11px] text-ink-4 mt-2">{t('subscription.payment_soon')}</p>

      <button
        onClick={() => void signOut()}
        className="mt-6 text-xs font-semibold text-ink-3 underline tap-highlight-none"
      >
        {t('subscription.sign_out')}
      </button>
    </div>
  )
}
