/**
 * EJEMPLO DE INTEGRACIÓN: PhotoGallery en PlantDetail
 *
 * Este archivo muestra cómo usar PhotoGallery en un contexto real.
 * Se integra en DiarySection, que es parte del tab "Diary" en PlantDetail.
 */

import { useWeekLog } from '@/hooks/useWeekLog'
import { PhotoGallery } from '@/components/gallery'

interface PlantGalleryExampleProps {
  plantId: string
}

export function PlantGalleryExample({ plantId }: PlantGalleryExampleProps) {
  const { logs, addLog, deleteLog } = useWeekLog(plantId)

  /**
   * Handler: agregar nueva foto
   * - Llama addLog() del store para persistir en localStorage
   * - Se dispara cuando user guarda en preview modal
   */
  function handleAddPhoto(photoDataUrl: string, logDate?: Date) {
    addLog({
      plantId,
      weekLabel: 'VEGE S3', // En DiarySection, viene del currentWeekLabel
      logDate: logDate || new Date(),
      notes: '', // User puede agregar notas luego desde sheet
      photoDataUrl,
    })
    // Future: toast o feedback visual
  }

  /**
   * Handler: eliminar foto
   * - Llama deleteLog() para remover del store
   * - Se dispara después de confirmación
   */
  function handleDeletePhoto(logId: string) {
    deleteLog(logId)
    // Future: toast o undo option
  }

  return (
    <section className="space-y-8">
      {/* Otras secciones del diario... */}

      {/* Galería de fotos integrada */}
      <PhotoGallery
        logs={logs}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Más contenido... */}
    </section>
  )
}

/**
 * FLUJO COMPLETO:
 *
 * 1. USER ABRE PLANTA
 *    - DiarySection recibe plantId
 *    - useWeekLog(plantId) carga logs del store
 *    - PhotoGallery renderiza grid de fotos existentes
 *
 * 2. USER SUBE FOTO
 *    - Click "Agregar" button
 *    - File picker abre (JPG, PNG, WebP)
 *    - Selecciona archivo
 *    - handleFileSelect() valida:
 *      - Tipo: image/*
 *      - Tamaño: ≤10 MB
 *    - resizeImageFile() comprime a:
 *      - Max 1920×1440
 *      - Quality 0.82 (JPEG)
 *      - Max 2 MB
 *    - Preview modal aparece
 *    - User puede:
 *      - Cancelar: descarta
 *      - Guardar: handleAddPhoto()
 *
 * 3. GUARDAR FOTO
 *    - handleAddPhoto(dataUrl, date) es llamado
 *    - addLog() agrega a store
 *    - localStorage persiste automáticamente
 *    - Grid se refresca
 *    - Foto aparece bajo su semana (VEGE S3, etc)
 *
 * 4. VER LIGHTBOX
 *    - User hace click en foto
 *    - Lightbox abre fullscreen
 *    - Swipe left/right para navegar
 *    - Escape o X para cerrar
 *    - Foto se muestra a tamaño pantalla
 *    - Info bottom bar: semana, fecha, notas
 *
 * 5. ELIMINAR FOTO
 *    - Hover sobre foto → aparecen botones
 *    - Click en 🗑️
 *    - Modal de confirmación
 *    - Click "Eliminar"
 *    - handleDeletePhoto(logId) es llamado
 *    - deleteLog() remueve del store
 *    - localStorage se actualiza
 *    - Grid se refresca sin la foto
 *
 * 6. PERSISTENCIA
 *    - Todas las fotos viven en WeekLogStore
 *    - Storage: localStorage ("cannatrack-weeklogs")
 *    - Format: JSON con dateReviver para Date objects
 *    - Future: migrar a Supabase Storage
 */
