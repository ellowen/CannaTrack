import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { showErrorToast, showSuccessToast } from '@/store/toastStore'
import { createPlantShare, getPlantShareToken, revokePlantShare, sharedDiaryUrl } from '@/lib/shared-diary'
import { track } from '@/lib/analytics'

/** Crear, copiar y revocar el link publico (solo lectura) del diario de una planta. */
export default function ShareDiaryCard({ plantId }: { plantId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    getPlantShareToken(plantId)
      .then((tok) => { if (!cancelled) setToken(tok) })
      .catch(() => { /* sin conexion o sin planta en el servidor: se muestra como "no compartida" */ })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [plantId])

  async function create() {
    if (!user) return
    setBusy(true)
    try {
      setToken(await createPlantShare(plantId, user.id))
      track('diary_shared')
    } catch {
      showErrorToast(t('share.error'))
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    setConfirmStop(false)
    setBusy(true)
    try {
      await revokePlantShare(plantId)
      setToken(null)
    } catch {
      showErrorToast(t('share.error'))
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(sharedDiaryUrl(token))
      showSuccessToast(t('share.copied'))
    } catch {
      showErrorToast(t('share.error'))
    }
  }

  if (!loaded) return null

  return (
    <section data-testid="share-diary" className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 mb-4">
      <p className="text-sm font-semibold text-ink-1">{t('share.title')}</p>
      <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{t('share.desc')}</p>

      {token ? (
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-brand-text bg-brand-subtle border border-brand-border rounded-full px-2 py-0.5">{t('share.active')}</span>
            <input
              readOnly
              aria-label={t('share.title')}
              value={sharedDiaryUrl(token)}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 text-xs text-ink-2 bg-app-elevated border border-app-border rounded-lg px-2.5 py-2"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={copy} className="flex-1">{t('share.copy')}</Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmStop(true)} disabled={busy} className="flex-1">{t('share.stop')}</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="mt-3" onClick={create} disabled={busy}>
          {busy ? t('share.creating') : t('share.create')}
        </Button>
      )}

      {confirmStop && (
        <ConfirmDialog
          title={t('share.stop_title')}
          message={t('share.stop_message')}
          confirmLabel={t('share.stop')}
          onConfirm={stop}
          onCancel={() => setConfirmStop(false)}
        />
      )}
    </section>
  )
}
