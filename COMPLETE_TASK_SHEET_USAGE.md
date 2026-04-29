# CompleteTaskSheet — Guía de Uso

Componente modal para completar tareas con registro de mediciones EC/pH.

## Ubicación

`/frontend/src/components/modals/CompleteTaskSheet.tsx`

## Props

```typescript
interface CompleteTaskSheetProps {
  isOpen: boolean                                    // Controla visibilidad
  task: ScheduledTask                                // Tarea a completar
  plant: Plant                                       // Planta asociada
  onClose: () => void                                // Callback cerrar
  onSave?: (ec?: number, ph?: number, temp?: number, notes?: string) => void
}
```

## Ejemplo de Uso

```tsx
import { useState } from 'react'
import { CompleteTaskSheet } from '@/components/modals'
import type { ScheduledTask, Plant } from '@/types/plant'

export default function TaskListPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)

  const handleOpenModal = (task: ScheduledTask, plant: Plant) => {
    setSelectedTask(task)
    setSelectedPlant(plant)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
    setSelectedPlant(null)
  }

  const handleSave = (ec?: number, ph?: number, temp?: number, notes?: string) => {
    console.log('Tarea guardada:', { ec, ph, temp, notes })
    // UI ya se actualiza automáticamente vía stores
  }

  return (
    <div>
      {/* Botones para abrir modal */}
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => handleOpenModal(task, plant)}
        >
          {task.type}
        </button>
      ))}

      {/* Modal */}
      {selectedTask && selectedPlant && (
        <CompleteTaskSheet
          isOpen={isModalOpen}
          task={selectedTask}
          plant={selectedPlant}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
```

## Flujos Soportados

### 1. Saltar (sin mediciones)
```
Click [Saltar]
├─ completeTask() → tarea marcada completada
├─ XP otorgado (base según task.type)
├─ Streak recalculado
└─ Modal cierra (1.4s)
```

### 2. Guardar (con mediciones)
```
Ingresar EC, pH (opcional temp y notas)
Click [Guardar]
├─ Validación real-time (rojo/amarillo/verde)
├─ addLog() → MeasurementLog guardado
├─ completeTask() con completionNotes
├─ addXP() → XP base + streak bonus si aplica
├─ Mostrar overlay de recompensa (1.4s)
└─ Modal cierra automáticamente
```

## Validación EC/pH

Colores automáticos según rangos de la tabla nutricional:

- **Verde (✓)**: Dentro del rango ideal
- **Amarillo (≈)**: Dentro de ±0.2 del rango (tolerancia)
- **Rojo (⚠️)**: Fuera de rango (pero permite guardar)

El usuario puede forzar guardado incluso con valores fuera de rango.

## Cálculo de XP

Base por tipo tarea (definido en `gamification.ts`):

| Tipo | Base XP |
|------|---------|
| nutrition | 25 |
| irrigation | 5 |
| foliar | 8 |
| observation | 3 |
| harvest | 100 |

**Bonificaciones:**
- Streak 7 días: +200 XP
- Streak 30 días: +1000 XP

## Animación XP Reward

Al guardar exitosamente:

```
✅ (bounce animation)
+XX XP (pulse animation)
🔥 N días seguidos (si streak >= 2)
```

Dura 1.4 segundos, luego cierra modal automáticamente.

## Almacenamiento

Todo persiste automáticamente vía Zustand localStorage:

- **taskStore**: completeTask() marca tarea como completada
- **measurementStore**: addLog() guarda medición EC/pH/temp
- **userStore**: addXP() suma XP y recalcula streak
- **Nota**: No hay backend sync aún (futura Etapa 2)

## Responsive

- **Mobile**: Bottom sheet swipeable (drag handle visible)
- **Desktop**: Modal centrado, max-width 400px
- **Dark mode**: Soportado completo con Tailwind dark: colors

## Checklist Completado

✓ Modal opens/closes con animación suave
✓ EC/pH validation real-time con colores dinámicos
✓ Save → taskStore + measurementStore + userStore integrado
✓ XP reward overlay 1.4s con animations
✓ Streak bonus calculado correctamente
✓ Notes persisten en completionNotes
✓ Responsive mobile + desktop
✓ Dark mode soportado
✓ Compila sin errores TypeScript

## Archivos Relacionados

- `/frontend/src/types/plant.ts` — Tipos ScheduledTask, Plant
- `/frontend/src/store/taskStore.ts` — completeTask()
- `/frontend/src/store/measurementStore.ts` — addLog()
- `/frontend/src/store/userStore.ts` — addXP()
- `/frontend/src/lib/nutrition-utils.ts` — getRangesForDate()
- `/frontend/src/lib/gamification.ts` — XP constants
