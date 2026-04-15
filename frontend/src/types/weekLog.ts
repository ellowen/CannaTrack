export interface WeekLog {
  id: string
  plantId: string
  weekLabel: string    // e.g. "VEGE S2", "FLORA F4" — auto-filled at creation
  logDate: Date
  notes: string
  photoDataUrl?: string
}
