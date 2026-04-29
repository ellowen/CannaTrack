/**
 * EJEMPLO DE INTEGRACIÓN — CompleteTaskSheet
 *
 * Este archivo muestra cómo integrar el componente en una página de tareas.
 * No incluir en build (usar solo como referencia).
 */

import { useState } from 'react'
import { CompleteTaskSheet } from '@/components/modals'
import { useTaskStore } from '@/store/taskStore'
import { usePlantStore } from '@/store/plantStore'
import type { ScheduledTask, Plant } from '@/types/plant'

export default function TaskListExamplePage() {
  const tasks = useTaskStore((s) => s.tasks)
  const plants = usePlantStore((s) => s.plants)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)

  const handleOpenModal = (task: ScheduledTask) => {
    const plant = plants.find((p) => p.id === task.plantId)
    if (!plant) return

    setSelectedTask(task)
    setSelectedPlant(plant)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setSelectedTask(null)
      setSelectedPlant(null)
    }, 150) // Esperar animación
  }

  const handleSaveTask = (
    ec?: number,
    ph?: number,
    temp?: number,
    notes?: string
  ) => {
    console.log('Tarea completada:', { ec, ph, temp, notes })
    // Automaticamente la tarea está marcada como completada
    // y las mediciones guardadas en los stores
  }

  // Tareas de hoy pendientes
  const todayTasks = tasks.filter((t) => {
    const today = new Date()
    return (
      !t.completed &&
      t.scheduledDate.toDateString() === today.toDateString()
    )
  })

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tareas de Hoy</h1>

      <div className="space-y-2">
        {todayTasks.map((task) => {
          const plant = plants.find((p) => p.id === task.plantId)
          return (
            <button
              key={task.id}
              onClick={() => handleOpenModal(task)}
              className="w-full p-4 text-left bg-white rounded-lg border hover:border-brand-400 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {task.type === 'nutrition'
                    ? '💧'
                    : task.type === 'irrigation'
                      ? '💧'
                      : task.type === 'foliar'
                        ? '🌿'
                        : '👁️'}
                </span>
                <span className="font-semibold">
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {plant?.name} • Semana {task.week}
              </p>
            </button>
          )
        })}
      </div>

      {/* Modal */}
      {selectedTask && selectedPlant && (
        <CompleteTaskSheet
          isOpen={isModalOpen}
          task={selectedTask}
          plant={selectedPlant}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}
