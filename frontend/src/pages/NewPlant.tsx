import { useNavigate, Link } from 'react-router-dom'
import { usePlants } from '@/hooks/usePlants'
import { usePlantStore } from '@/store/plantStore'
import { useUserStore } from '@/store/userStore'
import { PlantForm } from '@/components/plant'
import type { PlantFormValues } from '@/components/plant'
import { hapticSuccess } from '@/lib/haptics'
import { useTranslation } from '@/i18n'

const FREE_PLANT_LIMIT = 1

export default function NewPlant() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addPlant } = usePlants()
  const plan   = useUserStore((s) => s.plan)
  const plants = usePlantStore((s) => s.plants)

  const activePlants = plants.filter((p) => p.status === 'active')
  const atFreeLimit  = plan === 'free' && activePlants.length >= FREE_PLANT_LIMIT

  async function handleSubmit(values: PlantFormValues) {
    hapticSuccess()
    const [year, month, day] = values.startDate.split('-').map(Number)
    const plant = await addPlant({
      name: values.name,
      genetics: values.genetics,
      geneticType: values.geneticType,
      sex: values.sex,
      startDate: new Date(year, month - 1, day),
      location: values.location,
      potCount: values.potCount,
      potVolumeLiters: values.potVolumeLiters,
      nutritionTableId: values.nutritionTableId,
      autoFlowerTotalDays: values.autoFlowerTotalDays,
      availableProducts: values.availableProducts,
      customProducts: values.customProducts.length > 0 ? values.customProducts : undefined,
      status: 'active',
      notes: values.notes || undefined,
    })

    navigate(`/plants/${plant.id}`)
  }

  if (atFreeLimit) {
    return (
      <div className="px-4 pt-8 pb-8 flex flex-col min-h-[80vh]">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/plants"
            className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-2 tap-highlight-none active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-ink-1">{t('newPlant.title')}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-3xl bg-brand-subtle border border-brand-border flex items-center justify-center text-4xl mb-6 float">
            🔒
          </div>
          <h2 className="text-xl font-black text-ink-1 mb-2">{t('newPlant.plan_limit_title')}</h2>
          <p className="text-sm text-ink-3 leading-relaxed max-w-[280px] mb-8">
            {t('newPlant.plan_limit_desc')}
          </p>

          <div className="w-full max-w-[300px] space-y-3">
            {/* Pro — coming soon */}
            <div className="glass-card rounded-2xl p-4 border-brand-border relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-emerald-400" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-ink-1">{t('newPlant.pro_label')}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-subtle border border-brand-border text-brand-400">{t('newPlant.coming_soon')}</span>
              </div>
              <ul className="space-y-1.5 text-left mb-4">
                {[t('newPlant.pro_unlimited_plants'), t('newPlant.pro_all_tables'), t('newPlant.pro_ai_diagnosis'), t('newPlant.pro_advanced_stats')].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-ink-2">
                    <span className="text-brand-400 font-black">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full py-3 rounded-xl bg-brand-400/30 text-brand-400/60 font-bold text-sm cursor-not-allowed"
              >
                {t('newPlant.pro_pricing')}
              </button>
            </div>

            {/* Alternativa: ir a gestionar planta activa */}
            <Link
              to="/plants"
              className="block w-full py-3 rounded-xl bg-app-elevated border border-app-border text-sm font-semibold text-ink-2 text-center tap-highlight-none active:scale-[0.98] transition-all"
            >
              {t('newPlant.manage_active')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-7">
        <Link
          to="/"
          className="w-9 h-9 rounded-xl bg-app-elevated border border-app-border flex items-center justify-center text-ink-2 tap-highlight-none active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-1 leading-tight">{t('newPlant.title')}</h1>
          <p className="text-xs text-ink-3 mt-0.5">{t('newPlant.header_subtitle')}</p>
        </div>
      </div>

      <PlantForm onSubmit={handleSubmit} />
    </div>
  )
}
