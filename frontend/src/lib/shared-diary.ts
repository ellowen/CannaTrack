import { supabase } from '@/lib/auth'
import { extractPhotoStoragePath } from '@/lib/sync'
import { parseDateOnly } from '@/lib/date-utils'
import type { Plant } from '@/types/plant'

/** Las fotos compartidas duran poco: dejar de compartir las corta, salvo la URL ya firmada. */
const SHARED_PHOTO_TTL_SECONDS = 60 * 60

/** Fila tal como la devuelve get_public_diary (jsonb). */
export interface PublicDiaryRow {
  plant: {
    name: string
    genetics: string | null
    genetic_type: Plant['geneticType'] | null
    crop_type: Plant['cropType'] | null
    status: Plant['status']
    start_date: string
    flora_start_date: string | null
    flora_days: number | null
    vege_days: number | null
    auto_flower_total_days: number | null
    auto_flora_start_day: number | null
    end_date: string | null
    harvest_weight_g: number | null
  }
  logs: { id: string; week_label: string; log_date: string; notes: string | null; photo_path: string | null }[]
}

export interface SharedDiaryEntry {
  id: string
  weekLabel: string
  logDate: Date
  notes: string
  photoUrl?: string
}

export interface SharedDiary {
  plant: Pick<Plant, 'name' | 'genetics' | 'cropType' | 'geneticType' | 'status' | 'startDate' | 'floraStartDate' | 'floraDays' | 'vegeDays' | 'autoFlowerTotalDays' | 'autoFloraStartDay' | 'endDate' | 'harvestWeightG'>
  entries: SharedDiaryEntry[]
}

/** Pasa la fila de la base al modelo de la app (fechas como Date, null como undefined). */
export function toSharedDiary(row: PublicDiaryRow, photoUrls: Record<string, string> = {}): SharedDiary {
  const p = row.plant
  return {
    plant: {
      name: p.name,
      genetics: p.genetics ?? '',
      cropType: p.crop_type ?? undefined,
      geneticType: p.genetic_type ?? undefined,
      status: p.status,
      startDate: parseDateOnly(p.start_date),
      floraStartDate: p.flora_start_date ? parseDateOnly(p.flora_start_date) : undefined,
      floraDays: p.flora_days ?? undefined,
      vegeDays: p.vege_days ?? undefined,
      autoFlowerTotalDays: p.auto_flower_total_days ?? undefined,
      autoFloraStartDay: p.auto_flora_start_day ?? undefined,
      endDate: p.end_date ? parseDateOnly(p.end_date) : undefined,
      harvestWeightG: p.harvest_weight_g ?? undefined,
    },
    entries: row.logs.map((l) => ({
      id: l.id,
      weekLabel: l.week_label,
      logDate: parseDateOnly(l.log_date),
      notes: l.notes ?? '',
      photoUrl: photoUrls[l.id],
    })),
  }
}

/** Trae un diario publico por su token. null si el link no existe (o dejaron de compartirlo). */
export async function fetchSharedDiary(token: string): Promise<SharedDiary | null> {
  const { data, error } = await supabase.rpc('get_public_diary', { p_token: token })
  if (error) throw error
  if (!data) return null
  const row = data as PublicDiaryRow

  const photoUrls: Record<string, string> = {}
  await Promise.all(row.logs.filter((l) => l.photo_path).map(async (l) => {
    const { data: signed } = await supabase.storage
      .from('plant-photos')
      .createSignedUrl(extractPhotoStoragePath(l.photo_path!), SHARED_PHOTO_TTL_SECONDS)
    if (signed?.signedUrl) photoUrls[l.id] = signed.signedUrl
  }))
  return toSharedDiary(row, photoUrls)
}

/** Token del link activo de la planta (solo el dueno puede leerlo), o null si no se comparte. */
export async function getPlantShareToken(plantId: string): Promise<string | null> {
  const { data, error } = await supabase.from('plant_shares').select('token').eq('plant_id', plantId).maybeSingle()
  if (error) throw error
  return (data?.token as string | undefined) ?? null
}

export async function createPlantShare(plantId: string, userId: string): Promise<string> {
  const { data, error } = await supabase.from('plant_shares').insert({ plant_id: plantId, user_id: userId }).select('token').single()
  if (error) throw error
  return data.token as string
}

export async function revokePlantShare(plantId: string): Promise<void> {
  const { error } = await supabase.from('plant_shares').delete().eq('plant_id', plantId)
  if (error) throw error
}

/** URL publica del diario (la que se copia y se manda). */
export function sharedDiaryUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/d/${token}`
}
