export interface WeekLog {
  id: string
  plantId: string
  weekLabel: string
  logDate: Date
  notes: string
  photoDataUrl?: string  // base64 local (offline)
  photoUrl?: string      // URL publica en Supabase Storage
}
