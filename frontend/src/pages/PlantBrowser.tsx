import { useState } from 'react'
import { Button } from '@/components/ui'
import PlantCard from '@/components/plant/PlantCard'
import PlantForm, { type PlantFormValues } from '@/components/plant/PlantForm'
import { usePlantStore } from '@/store/plantStore'
import type { Plant, GeneticType } from '@/types/plant'
import { clsx } from 'clsx'

type FilterTab = 'active' | 'all' | 'archived'

export default function PlantBrowser() {
  const plants = usePlantStore((s) => s.plants)
  const addPlant = usePlantStore((s) => s.addPlant)

  const [filterTab, setFilterTab] = useState<FilterTab>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingPlant, setCreatingPlant] = useState(false)

  const filteredPlants = plants.filter((p) => {
    if (filterTab === 'active') return p.status === 'active'
    if (filterTab === 'archived') return p.status === 'harvested' || p.status === 'discarded'
    return true
  })

  const sortedPlants = [...filteredPlants].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  )

  const handleCreatePlant = async (values: PlantFormValues) => {
    setCreatingPlant(true)
    try {
      const startDate = new Date(values.startDate)
      startDate.setHours(0, 0, 0, 0)

      const newPlant: Plant = {
        id: `plant-${Date.now()}`,
        name: values.name,
        genetics: values.genetics,
        geneticType: values.geneticType as GeneticType,
        sex: values.sex,
        startDate,
        autoFlowerTotalDays: values.autoFlowerTotalDays,
        location: values.location,
        potCount: values.potCount,
        potVolumeLiters: values.potVolumeLiters,
        nutritionTableId: values.nutritionTableId,
        availableProducts: values.availableProducts,
        customProducts: values.customProducts,
        status: 'active',
        notes: values.notes,
      }

      addPlant(newPlant)
      setShowCreateModal(false)
    } finally {
      setCreatingPlant(false)
    }
  }

  const emptyStateContent = (() => {
    if (filterTab === 'active') {
      return {
        icon: '🌱',
        title: 'Sin plantas activas',
        desc: 'Crea tu primera planta para empezar a hacer seguimiento.',
        action: 'Agregar primera planta',
      }
    }
    if (filterTab === 'archived') {
      return {
        icon: '✂️',
        title: 'Sin plantas cosechadas',
        desc: 'Aqui apareceran las plantas que completes o descartes.',
        action: null,
      }
    }
    return {
      icon: '🌿',
      title: 'Sin plantas',
      desc: 'Crea tu primera planta para comenzar.',
      action: 'Crear planta',
    }
  })()

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-app-bg/95 backdrop-blur-sm border-b border-app-border">
        <div className="px-5 pt-4 pb-4">
          <h1 className="text-2xl font-bold text-ink-1">Mis plantas</h1>
        </div>

        {/* Filter tabs */}
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            {(['active', 'all', 'archived'] as const).map((tab) => {
              const labels = {
                active: 'Activas',
                all: 'Todas',
                archived: 'Cosechadas',
              }
              return (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={clsx(
                    'px-3.5 py-2 text-sm font-medium rounded-lg transition-all tap-highlight-none active:scale-95',
                    filterTab === tab
                      ? 'bg-brand-400 text-white shadow-glow-brand'
                      : 'bg-app-elevated text-ink-3 border border-app-border hover:border-app-border-strong'
                  )}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Plant grid or empty state */}
      <div className="px-5 py-6 pb-20">
        {sortedPlants.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="text-6xl mb-4 opacity-40">{emptyStateContent.icon}</div>
            <h2 className="text-xl font-bold text-ink-1 mb-2">{emptyStateContent.title}</h2>
            <p className="text-sm text-ink-3 mb-6 max-w-xs">{emptyStateContent.desc}</p>
            {emptyStateContent.action && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowCreateModal(true)}
              >
                {emptyStateContent.action}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPlants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </div>

      {/* Floating action button */}
      {sortedPlants.length > 0 && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-14 h-14 rounded-full bg-brand-400 text-white shadow-lg flex items-center justify-center active:scale-[0.93] transition-all tap-highlight-none hover:shadow-xl"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Create plant modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-app-bg rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 border-b border-app-border bg-app-bg/95">
              <h2 className="text-lg font-bold text-ink-1">Nueva planta</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-app-elevated tap-highlight-none transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <PlantForm
                onSubmit={handleCreatePlant}
                loading={creatingPlant}
                submitLabel="Crear planta"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
