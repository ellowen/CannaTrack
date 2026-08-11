import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es as esLocale, enUS } from 'date-fns/locale'
import { useUserStore, type ThemePreference } from '@/store/userStore'
import { hasProAccess } from '@/lib/plan'
import { LANGUAGES } from '@/i18n'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/auth'
import { Button, Toggle } from '@/components/ui'
import { clsx } from 'clsx'
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/notifications'
import { generatePlantSchedule } from '@/lib/nutrition-engine'
import { replacePendingTasksForPlantInSupabase } from '@/lib/sync'
import { showErrorToast } from '@/store/toastStore'
import { useSubscription } from '@/hooks/useSubscription'

const fieldClass =
  'w-full rounded-xl border border-app-border bg-app-card text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border placeholder:text-ink-4 transition-colors shadow-card'

const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistema', icon: '⚙️' },
  { value: 'light',  label: 'Claro',   icon: '☀️' },
  { value: 'dark',   label: 'Oscuro',  icon: '🌙' },
]

export default function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { name, potVolumeLiters, theme, language, notificationsEnabled, reminderHour, setName, setPotVolume, setTheme, setLanguage, setNotificationsEnabled } = useUserStore()
  const { plants } = usePlantStore()
  const { tasks, setTasks } = useTaskStore()
  const { tables, removeTable } = useNutritionStore()
  const customTables = tables.filter((tbl) => !tbl.isOfficial)
  const officialTables = tables.filter((tbl) => tbl.isOfficial)
  const subscription = useSubscription()
  const [signingOut, setSigningOut] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [usernameError, setUsernameError] = useState('')

  useEffect(() => {
    if (!user) return
    void supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsernameInput(data.username)
        else setUsernameInput(name)
      })
  }, [user?.id])

  function handleDeleteTable(tableId: string, tableName: string) {
    const plantsUsingTable = plants.filter((p) => p.nutritionTableId === tableId && p.status === 'active')
    if (plantsUsingTable.length > 0) {
      alert(`No se puede eliminar: ${plantsUsingTable.length} planta${plantsUsingTable.length > 1 ? 's' : ''} activa${plantsUsingTable.length > 1 ? 's' : ''} la usa${plantsUsingTable.length > 1 ? 'n' : ''}.`)
      return
    }
    if (!confirm(`¿Eliminar la tabla "${tableName}"? No se puede deshacer.`)) return
    removeTable(tableId)
  }
  const [nameInput, setNameInput] = useState(name)
  const [volumeInput, setVolumeInput] = useState(potVolumeLiters)
  const [saved, setSaved] = useState(false)
  const [regenDone, setRegenDone] = useState(false)
  const notifBlocked = 'Notification' in window && Notification.permission === 'denied'

  async function handleRegenerate() {
    if (!confirm(
      'Se van a recalcular las tareas pendientes de tus plantas activas según su tabla nutricional actual. Las tareas ya completadas NO se van a tocar. ¿Continuar?'
    )) return

    const activePlants = plants.filter((p) => p.status === 'active')
    try {
      for (const plant of activePlants) {
        const table = tables.find((tbl) => tbl.id === plant.nutritionTableId)
        if (!table) continue
        const candidateTasks = generatePlantSchedule(plant, table)

        // Las tareas ya completadas son historial: nunca se borran ni se
        // regeneran (mismo criterio que usePlants.editPlant -- antes esta
        // funcion usaba replaceTasksForPlantInSupabase, que borraba TODO,
        // incluidas las completadas, perdiendo completed_at/xp_awarded y
        // habilitando re-otorgar XP por la misma tarea).
        const existingForPlant = tasks.filter((t) => t.plantId === plant.id)
        const completedExisting = existingForPlant.filter((t) => t.completed)
        const slotKey = (t: { cycle: string; week: number; type: string }) => `${t.cycle}|${t.week}|${t.type}`
        const completedSlots = new Set(completedExisting.map(slotKey))
        const newPending = candidateTasks.filter((t) => !completedSlots.has(slotKey(t)))

        setTasks(plant.id, [...completedExisting, ...newPending])
        // Persistir en la DB: reemplaza solo las tareas pendientes.
        await replacePendingTasksForPlantInSupabase(plant.id, newPending)
      }
      setRegenDone(true)
      setTimeout(() => setRegenDone(false), 3000)
    } catch (error) {
      console.error('[handleRegenerate] Error sincronizando:', error)
      showErrorToast('No se pudieron regenerar los calendarios. Revisá tu conexión e intentá de nuevo.')
    }
  }

  async function handleNotifToggle() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      if (user) void unsubscribeFromPush(user.id)
      return
    }
    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      setNotificationsEnabled(true)
      if (user) void subscribeToPush(user.id, reminderHour)
    }
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim()
    if (!trimmed) { setUsernameError(t('settings.username_empty_error')); return }
    if (trimmed.length > 30) { setUsernameError(t('settings.username_max_error')); return }
    if (!user) return
    setUsernameSaving(true)
    setUsernameError('')
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id)
    if (error) { setUsernameError(t('settings.username_save_error')); setUsernameSaving(false); return }
    setName(trimmed)
    setUsernameSaving(false)
    setUsernameSaved(true)
    setTimeout(() => setUsernameSaved(false), 2000)
  }

  async function handleSave() {
    const trimmedName = nameInput.trim() || 'Cultivador'
    setName(trimmedName)
    setPotVolume(Number(volumeInput) || 11)
    // Sin esto, el nombre guardado aca se pierde en el proximo reload: al
    // reautenticar, AuthContext pisa userStore.name con profiles.username
    // del servidor (ver AuthContext.loadUserData -> setUser). El builder de
    // supabase-js es "lazy" (thenable): sin await, el fetch nunca se dispara.
    if (user) await supabase.from('profiles').update({ username: trimmedName }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-8 pb-4 space-y-6">
      <h1 className="text-2xl font-black text-ink-1">Ajustes ⚙️</h1>

      {/* Apariencia */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Apariencia</p>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink-2 mb-3">{t('settings.tema_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all tap-highlight-none active:scale-95',
                  theme === opt.value
                    ? 'bg-brand-subtle border-brand-border text-brand-500'
                    : 'bg-app-elevated border-app-border text-ink-3 hover:border-app-border-strong'
                )}
              >
                <span className="text-xl">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Idioma */}
      <section>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink-2 mb-3">{t('settings.language_label')}</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all tap-highlight-none active:scale-95',
                  language === lang.code
                    ? 'bg-brand-subtle border-brand-border text-brand-500'
                    : 'bg-app-elevated border-app-border text-ink-3 hover:border-app-border-strong'
                )}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plan */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">{t('settings.plan_section')}</p>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-ink-1">
                {subscription.plan === 'free' && `🌱 ${t('settings.plan_free_label')}`}
                {subscription.plan === 'trial' && `⏳ ${t('settings.plan_trial_label')}`}
                {subscription.plan === 'pro' && `⭐ ${t('settings.plan_pro_label')}`}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                {subscription.plan === 'free' && t('settings.plan_free_desc')}
                {subscription.plan === 'trial' && t('settings.plan_trial_desc')}
                {subscription.plan === 'pro' && t('settings.plan_pro_desc')}
              </p>
              {subscription.plan === 'trial' && subscription.trialEndsAt && (
                <>
                  <p className="text-xs text-amber-500 font-semibold mt-1">
                    {subscription.trialDaysLeft === 1
                      ? t('subscription.trial_last_day')
                      : t('subscription.trial_days_left', { days: subscription.trialDaysLeft })}
                  </p>
                  <p className="text-[11px] text-ink-4 mt-0.5">
                    {t('settings.trial_ends_on', {
                      date: format(subscription.trialEndsAt, 'd MMM yyyy', { locale: language === 'en' ? enUS : esLocale }),
                    })}
                  </p>
                </>
              )}
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
              subscription.plan === 'pro'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : subscription.plan === 'trial'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-app-elevated text-ink-3 border-app-border'
            }`}>
              {subscription.plan === 'free' && 'FREE'}
              {subscription.plan === 'trial' && 'TRIAL'}
              {subscription.plan === 'pro' && 'PRO ⭐'}
            </span>
          </div>
          {!hasProAccess(subscription.plan) && (
            <a
              href="mailto:cultitrack@gmail.com?subject=Quiero%20suscribirme%20a%20CultiTrack"
              className="block text-center w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
            >
              ⭐ {t('settings.upgrade_pro')}
            </a>
          )}
          {subscription.plan === 'trial' && (
            <a
              href="mailto:cultitrack@gmail.com?subject=Quiero%20suscribirme%20a%20CultiTrack"
              className="block text-center w-full py-3 rounded-xl border border-amber-500/30 text-amber-500 font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all mt-2"
            >
              {t('subscription.subscribe_cta')}
            </a>
          )}
        </div>
      </section>

      {/* Nombre de usuario */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Nombre de usuario</p>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => { setUsernameInput(e.target.value); setUsernameError('') }}
              maxLength={30}
              autoCorrect="off"
              autoCapitalize="none"
              placeholder={t('settings.username_placeholder')}
              className={fieldClass + ' flex-1'}
            />
            <button
              onClick={handleSaveUsername}
              disabled={usernameSaving || usernameInput.trim() === ''}
              className="shrink-0 text-sm font-bold px-4 py-3 rounded-xl transition-all tap-highlight-none active:scale-95 disabled:opacity-40"
              style={usernameSaved
                ? { background: 'var(--brand-subtle)', color: 'var(--brand-400)', border: '1px solid var(--brand-border)' }
                : { background: '#52CC64', color: '#080E09' }
              }
            >
              {usernameSaving ? '...' : usernameSaved ? '✓' : t('common.save')}
            </button>
          </div>
          {usernameError && <p className="text-xs text-red-400 mt-2">{usernameError}</p>}
        </div>
      </section>

      {/* Perfil */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Tu perfil</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">
              {t('settings.name_field')} 👤
            </label>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">
              {t('settings.pot_volume_field')} 🪴
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={200} value={volumeInput}
                onChange={(e) => setVolumeInput(Number(e.target.value))}
                className={fieldClass}
              />
              <span className="text-sm font-semibold text-ink-3 shrink-0">L</span>
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} variant={saved ? 'secondary' : 'primary'}>
            {saved ? `✓ ${t('settings.profile_saved')}` : t('settings.save_profile')}
          </Button>
        </div>
      </section>

      {/* Tablas nutricionales */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">Tablas nutricionales</p>
          {hasProAccess(subscription.plan) ? (
            <Link
              to="/nutrition/new?returnTo=/settings"
              className="text-xs font-semibold text-brand-400 tap-highlight-none active:scale-95 min-h-[40px] flex items-center px-1 -mx-1"
            >
              {t('settings.new_table')}
            </Link>
          ) : (
            <span className="text-xs text-ink-4 flex items-center gap-1">🔒 Pro</span>
          )}
        </div>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card divide-y divide-app-border overflow-hidden">
          {officialTables.map((tbl) => (
            <div key={tbl.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-1 truncate">{tbl.name}</p>
                <p className="text-[11px] text-ink-4 mt-0.5">
                  {t('settings.table_official')} · {tbl.vegeWeeks.length} {t('settings.table_vege')} · {tbl.floraWeeks.length} {t('settings.table_flora')}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-subtle text-brand-500 border border-brand-border shrink-0">
                {t('settings.table_official_badge')}
              </span>
            </div>
          ))}
          {customTables.map((tbl) => (
            <div key={tbl.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-1 truncate">{tbl.name}</p>
                <p className="text-[11px] text-ink-4 mt-0.5">
                  {t('settings.table_custom')} · {tbl.vegeWeeks.length} {t('settings.table_vege')} · {tbl.floraWeeks.length} {t('settings.table_flora')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/nutrition/new?edit=${tbl.id}&returnTo=/settings`}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-app-border text-ink-2 tap-highlight-none active:scale-95"
                >
                  {t('common.edit')}
                </Link>
                <button
                  onClick={() => handleDeleteTable(tbl.id, tbl.name)}
                  aria-label={`Eliminar tabla ${tbl.name}`}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 tap-highlight-none active:scale-95"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {customTables.length === 0 && (
            <div className="px-4 py-3 text-xs text-ink-4 italic">
              Sin tablas personalizadas. Creá una desde "+ Nueva".
            </div>
          )}
        </div>
      </section>

      {/* Notificaciones */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Notificaciones</p>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-semibold text-ink-1">Recordatorio diario</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {notifBlocked
                  ? t('settings.notif_blocked')
                  : t('settings.notif_desc')}
              </p>
            </div>
            <Toggle
              enabled={notificationsEnabled}
              onChange={handleNotifToggle}
              disabled={notifBlocked}
            />
          </div>
        </div>
      </section>

      {/* Acerca de */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">{t('settings.about_section')}</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 space-y-3">
          {[
            [`🏷️ ${t('settings.version_label')}`, t('settings.version_value')],
            ['🌿 Tabla nutricional', 'REVEGETAR v1'],
            ['💾 Datos', 'Almacenados localmente'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-ink-3">{label}</span>
              <span className="text-sm text-ink-2 font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Herramientas */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">{t('settings.tools_section')}</p>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">{t('settings.regen_title')}</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                {t('settings.regen_desc_full')}
              </p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenDone || plants.filter((p) => p.status === 'active').length === 0}
              className={clsx(
                'shrink-0 text-xs font-bold px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all disabled:opacity-40',
                regenDone
                  ? 'bg-brand-subtle text-brand-500 border border-brand-border'
                  : 'bg-app-elevated text-ink-2 border border-app-border-strong'
              )}
            >
              {regenDone ? '✓ Listo' : `↻ ${t('settings.regen_btn')}`}
            </button>
          </div>
        </div>
      </section>

      {/* Zona de peligro */}
      <section className="pb-2">
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Zona de peligro</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">Cerrar sesión</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                {t('settings.sign_out_desc')}
              </p>
            </div>
            <button
              onClick={async () => {
                setSigningOut(true)
                try {
                  await signOut()
                  navigate('/login', { replace: true })
                } catch (error) {
                  alert(t('settings.sign_out_error'))
                  setSigningOut(false)
                }
              }}
              disabled={signingOut}
              className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all disabled:opacity-50"
            >
              {signingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 pt-3 border-t border-app-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">{t('settings.delete_all_title')}</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                {t('settings.delete_all_desc')}
              </p>
            </div>
            <button
              onClick={() => {
                if (!confirm(`¿${t('settings.delete_all_title')}? ${t('settings.delete_all_confirm')}`)) return
                const keys = ['cultitrack-plants', 'cultitrack-tasks', 'cultitrack-weeklogs', 'cultitrack-measurements']
                keys.forEach((k) => localStorage.removeItem(k))
                window.location.reload()
              }}
              className="shrink-0 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
            >
              {t('settings.delete_all_btn')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
