/**
 * Compartir progreso de la planta.
 * Captura una view como imagen y la comparte via Share Sheet.
 * Mecanismo de crecimiento organico — los usuarios comparten su cultivo en redes.
 */
// Dynamic import — react-native-view-shot no existe en Expo Go
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let captureRef: ((...args: any[]) => Promise<string>) | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  captureRef = require('react-native-view-shot').captureRef
} catch {
  // Expo Go — compartir imagen no disponible
}
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { RefObject } from 'react'
import { track } from '@/lib/analytics'
import type { Plant } from '@shared/types/plant'

/**
 * Captura una ref de View como PNG y la comparte via Share Sheet.
 * Si Sharing no esta disponible, lanza un error descriptivo.
 */
export async function sharePlantCard(
  viewRef: RefObject<unknown>,
  plant:   Plant,
): Promise<void> {
  if (!captureRef) throw new Error('Compartir imagen no disponible en este entorno.')

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) throw new Error('Compartir no esta disponible en este dispositivo.')

  // Capturar la view como PNG
  const uri = await captureRef(viewRef, {
    format:  'png',
    quality: 1,
    result:  'tmpfile',
  })

  const filename = `cannatrack_${plant.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.png`
  const dest     = (FileSystem.cacheDirectory ?? '') + filename

  await FileSystem.copyAsync({ from: uri, to: dest })

  track('plant_shared', {
    plant_id:     plant.id,
    genetic_type: plant.geneticType,
    days_growing: Math.floor((Date.now() - plant.startDate.getTime()) / 86_400_000),
  })

  await Sharing.shareAsync(dest, {
    mimeType:    'image/png',
    dialogTitle: `Progreso de ${plant.name}`,
    UTI:         'public.png',
  })
}
