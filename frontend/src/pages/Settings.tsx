import { useState } from 'react'
import { useUserStore, type ThemePreference } from '@/store/userStore'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { Button } from '@/components/ui'
import { clsx } from 'clsx'
import { requestNotificationPermission } from '@/lib/notifications'
import { generatePlantSchedule } from '@/lib/nutrition-engine'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'

const fieldClass =
  'w-full rounded-xl border border-app-border bg-app-card text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border placeholder:text-ink-4 transition-colors shadow-card'

const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'Sistema', icon: '⚙️' },
  { value: 'light',  label: 'Claro',   icon: '☀️' },
  { value: 'dark',   label: 'Oscuro',  icon: '🌙' },
]

export default function Settings() {
  const { name, plan, potVolumeLiters, theme, notificationsEnabled, setName, setPotVolume, setTheme, setNotificationsEnabled } = useUserStore()
  const { plants } = usePlantStore()
  const { setTasks } = useTaskStore()
  const [nameInput, setNameInput] = useState(name)
  const [volumeInput, setVolumeInput] = useState(potVolumeLiters)
  const [saved, setSaved] = useState(false)
  const [regenDone, setRegenDone] = useState(false)
  const notifBlocked = 'Notification' in window && Notification.permission === 'denied'

  function handleRegenerate() {
    const activePlants = plants.filter((p) => p.status === 'active')
    for (const plant of activePlants) {
      const newTasks = generatePlantSchedule(plant, REVEGETAR_TABLE)
      setTasks(plant.id, newTasks)
    }
    setRegenDone(true)
    setTimeout(() => setRegenDone(false), 3000)
  }

  async function handleNotifToggle() {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      return
    }
    const permission = await requestNotificationPermission()
    if (permission === 'granted') setNotificationsEnabled(true)
  }

  function handleSave() {
    setName(nameInput.trim() || 'Cultivador')
    setPotVolume(Number(volumeInput) || 11)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-8 pb-4 space-y-6">
      <h1 className="text-2xl font-black text-ink-1">Ajustes ⚙️</h1>

      {/* Apariencia */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Apariencia</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
          <p className="text-sm font-semibold text-ink-2 mb-3">Tema</p>
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

      {/* Plan */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Tu plan</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-ink-1">
                {plan === 'free' ? '🌱 Plan Free' : '⭐ Plan Pro'}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">
                {plan === 'free'
                  ? '1 planta activa · Tabla REVEGETAR'
                  : 'Plantas ilimitadas · Todas las tablas'}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              plan === 'pro'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-app-elevated text-ink-3 border-app-border'
            }`}>
              {plan === 'free' ? 'FREE' : 'PRO ⭐'}
            </span>
          </div>
          {plan === 'free' && (
            <button
              onClick={() => alert('Próximamente — Plan Pro disponible en la versión comercial')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-card-md"
            >
              ⭐ Actualizar a Pro
            </button>
          )}
        </div>
      </section>

      {/* Perfil */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Tu perfil</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">
              Nombre 👤
            </label>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">
              Volumen de maceta por defecto 🪴
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
            {saved ? '✓ Guardado' : 'Guardar cambios'}
          </Button>
        </div>
      </section>

      {/* Notificaciones */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Notificaciones</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-semibold text-ink-1">Recordatorio diario</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {notifBlocked
                  ? 'Bloqueado en el navegador — habilitalo en Configuración del sistema'
                  : 'Recibí un aviso cuando abrís la app si tenés tareas pendientes'}
              </p>
            </div>
            <button
              onClick={handleNotifToggle}
              disabled={notifBlocked}
              className={clsx(
                'relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 tap-highlight-none disabled:opacity-40 disabled:pointer-events-none',
                notificationsEnabled ? 'bg-brand-400' : 'bg-app-elevated border border-app-border-strong'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>
      </section>

      {/* Acerca de */}
      <section>
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Acerca de</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4 space-y-3">
          {[
            ['🏷️ Versión', '0.1.0 — MVP'],
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
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Herramientas</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">Regenerar calendarios</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                Recalcula todas las tareas de tus plantas activas. Útil si actualizaste la app.
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
              {regenDone ? '✓ Listo' : '↻ Regenerar'}
            </button>
          </div>
        </div>
      </section>

      {/* Zona de peligro */}
      <section className="pb-2">
        <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-3">Zona de peligro</p>
        <div className="bg-app-card rounded-2xl border border-app-border shadow-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">Borrar todos los datos</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                Elimina plantas, tareas, fotos y mediciones. No se puede deshacer.
              </p>
            </div>
            <button
              onClick={() => {
                if (!confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) return
                const keys = ['cannatrack-plants', 'cannatrack-tasks', 'cannatrack-weeklogs', 'cannatrack-measurements']
                keys.forEach((k) => localStorage.removeItem(k))
                window.location.reload()
              }}
              className="shrink-0 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 rounded-xl tap-highlight-none active:scale-95 transition-all"
            >
              Borrar todo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
