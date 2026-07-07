export interface WeekLog {
  id: string
  plantId: string
  weekLabel: string
  logDate: Date
  notes: string
  photoDataUrl?: string   // imagen embebida en base64 (offline)
  photoUrl?: string       // URL remota en Supabase Storage (tras sync)
}
