export interface MeasurementLog {
  id: string
  plantId: string
  logDate: Date
  ec: number
  ph: number
  tempCelsius?: number
}
