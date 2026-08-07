import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'

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
      className="mx-4 mt-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-2.5 flex items-center gap-3"
    >
      <span className="text-lg shrink-0">⏳</span>
      <p className="text-xs text-amber-400 font-semibold flex-1 min-w-0">
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
      <div className="text-5xl mb-4">🌱</div>
      <h1 className="text-xl font-black text-ink-1 mb-2">{t('subscription.expired_title')}</h1>
      <p className="text-sm text-ink-3 leading-relaxed max-w-sm mb-6">
        {t('subscription.expired_desc')}
      </p>

      <div className="w-full max-w-sm glass-card rounded-2xl p-5 mb-4 text-left">
        <p className="text-sm font-bold text-ink-1 mb-3">⭐ {t('subscription.pro_plan_title')}</p>
        <ul className="space-y-1.5 text-xs text-ink-2">
          <li>✓ {t('subscription.pro_feature_unlimited')}</li>
          <li>✓ {t('subscription.pro_feature_tables')}</li>
          <li>✓ {t('subscription.pro_feature_photos')}</li>
          <li>✓ {t('subscription.pro_feature_history')}</li>
        </ul>
      </div>

      <a
        href="mailto:cultitrack@gmail.com?subject=Quiero%20suscribirme%20a%20CultiTrack"
        className="w-full max-w-sm py-3.5 rounded-2xl bg-brand-400 text-white font-bold text-sm text-center shadow-glow-brand tap-highlight-none active:scale-[0.98] transition-all"
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
