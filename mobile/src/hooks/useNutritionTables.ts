import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface NutritionLine {
  code: string
  name: string
  colorClass: string
}

export interface ProductDose {
  name: string
  line: string
  unit: 'ml' | 'gr'
  minDose: number
  maxDose: number
}

export interface NutritionWeek {
  cycle: 'vege' | 'flora'
  week: number
  stage: string
  dayStart: number
  dayEnd: number
  products: ProductDose[]
  ecMin?: number
  ecMax?: number
  phMin?: number
  phMax?: number
}

export interface NutritionTable {
  id: string
  name: string
  brandId?: string
  isOfficial: boolean
  accessTier: 'free' | 'pro'
  vegeWeeks: NutritionWeek[]
  floraWeeks: NutritionWeek[]
  lines: NutritionLine[]
}

export function useNutritionTables() {
  const [tables, setTables] = useState<NutritionTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: tablesData, error: tableError } = await supabase
        .from('nutrition_tables')
        .select('*')

      if (tableError) throw tableError

      const enriched: NutritionTable[] = []

      for (const t of tablesData ?? []) {
        const { data: lines, error: lineError } = await supabase
          .from('nutrition_lines')
          .select('*')
          .eq('table_id', t.id)

        if (lineError) throw lineError

        const { data: weeks, error: weekError } = await supabase
          .from('nutrition_weeks')
          .select('*')
          .eq('table_id', t.id)

        if (weekError) throw weekError

        const { data: products, error: productError } = await supabase
          .from('nutrition_products')
          .select('*')

        if (productError) throw productError

        const parsedLines: NutritionLine[] = (lines ?? []).map(l => ({
          code: l.line_code as string,
          name: l.line_name as string,
          colorClass: l.color_class ?? ''
        }))

        const vegeWeeks: NutritionWeek[] = (weeks ?? [])
          .filter((w: Record<string, unknown>) => w.cycle === 'vege')
          .map((w: Record<string, unknown>) => ({
            cycle: 'vege' as const,
            week: w.week as number,
            stage: w.stage as string,
            dayStart: w.day_start as number,
            dayEnd: w.day_end as number,
            ecMin: w.ec_min as number | undefined,
            ecMax: w.ec_max as number | undefined,
            phMin: w.ph_min as number | undefined,
            phMax: w.ph_max as number | undefined,
            products: (products ?? [])
              .filter((p: Record<string, unknown>) => p.week_id === w.id)
              .map((p: Record<string, unknown>) => ({
                name: p.product_name as string,
                line: p.line_code as string,
                unit: p.unit as 'ml' | 'gr',
                minDose: parseFloat(p.min_dose as string),
                maxDose: parseFloat(p.max_dose as string)
              }))
          }))

        const floraWeeks: NutritionWeek[] = (weeks ?? [])
          .filter((w: Record<string, unknown>) => w.cycle === 'flora')
          .map((w: Record<string, unknown>) => ({
            cycle: 'flora' as const,
            week: w.week as number,
            stage: w.stage as string,
            dayStart: w.day_start as number,
            dayEnd: w.day_end as number,
            ecMin: w.ec_min as number | undefined,
            ecMax: w.ec_max as number | undefined,
            phMin: w.ph_min as number | undefined,
            phMax: w.ph_max as number | undefined,
            products: (products ?? [])
              .filter((p: Record<string, unknown>) => p.week_id === w.id)
              .map((p: Record<string, unknown>) => ({
                name: p.product_name as string,
                line: p.line_code as string,
                unit: p.unit as 'ml' | 'gr',
                minDose: parseFloat(p.min_dose as string),
                maxDose: parseFloat(p.max_dose as string)
              }))
          }))

        enriched.push({
          id: t.id as string,
          name: t.name as string,
          brandId: t.brand_id as string | undefined,
          isOfficial: t.is_official as boolean,
          accessTier: t.access_tier as 'free' | 'pro',
          lines: parsedLines,
          vegeWeeks,
          floraWeeks
        })
      }

      setTables(enriched)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error cargando tablas nutricionales'
      setError(message)
      console.error('Error cargando tablas nutricionales:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  function getTableById(id: string): NutritionTable | undefined {
    return tables.find(t => t.id === id)
  }

  return { tables, loading, error, getTableById, refetch: fetch }
}
