import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import { TOPCROP_TABLE } from '@shared/data/topcrop-table'
import type { NutritionTable, NutritionLine, NutritionWeek, PlantStage } from '@shared/types/plant'

// Tablas hardcodeadas como fallback offline (siempre disponibles sin conexion)
const FALLBACK_TABLES: NutritionTable[] = [REVEGETAR_TABLE, TOPCROP_TABLE]

export function useNutritionTables() {
  const [tables, setTables] = useState<NutritionTable[]>(FALLBACK_TABLES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Solo oficiales + tablas propias del usuario
      const query = supabase.from('nutrition_tables').select('*').eq('is_official', true)
      const { data: officialData, error: tableError } = await query
      const { data: customData } = user
        ? await supabase.from('nutrition_tables').select('*').eq('is_official', false).eq('creator_id', user.id)
        : { data: [] }

      const tablesData = [...(officialData ?? []), ...(customData ?? [])]
      if (tableError) throw tableError

      if (tableError) throw tableError
      if (!tablesData || tablesData.length === 0) return

      const { data: allLines } = await supabase.from('nutrition_lines').select('*')
      const { data: allWeeks } = await supabase.from('nutrition_weeks').select('*')
      const { data: allProducts } = await supabase.from('nutrition_products').select('*')

      const enriched: NutritionTable[] = []

      for (const t of tablesData) {
        const lines = (allLines ?? []).filter((l: Record<string, unknown>) => l.table_id === t.id)
        const weeks = (allWeeks ?? []).filter((w: Record<string, unknown>) => w.table_id === t.id)

        const parsedLines: NutritionLine[] = lines.map((l: Record<string, unknown>) => ({
          id: l.line_code as string,
          name: l.line_name as string,
          colorClass: (l.color_class as string) ?? ''
        }))

        const mapWeek = (w: Record<string, unknown>): NutritionWeek => ({
          cycle: w.cycle as 'vege' | 'flora',
          week: w.week as number,
          stage: w.stage as PlantStage,
          dayStart: w.day_start as number,
          dayEnd: w.day_end as number,
          ecMin: Number(w.ec_min) ?? 0,
          ecMax: Number(w.ec_max) ?? 0,
          phMin: Number(w.ph_min) ?? 6,
          phMax: Number(w.ph_max) ?? 6,
          products: (allProducts ?? [])
            .filter((p: Record<string, unknown>) => p.week_id === w.id)
            .map((p: Record<string, unknown>) => ({
              name: p.product_name as string,
              line: p.line_code as string,
              unit: p.unit as 'ml' | 'gr',
              minDose: parseFloat(p.min_dose as string),
              maxDose: parseFloat(p.max_dose as string)
            }))
        })

        enriched.push({
          id: t.id as string,
          name: t.name as string,
          brandId: (t.brand_id as string) ?? null,
          isOfficial: t.is_official as boolean,
          accessTier: t.access_tier as 'free' | 'pro',
          geneticTypes: [],
          lines: parsedLines,
          vegeWeeks: weeks.filter((w: Record<string, unknown>) => w.cycle === 'vege').map(mapWeek),
          floraWeeks: weeks.filter((w: Record<string, unknown>) => w.cycle === 'flora').map(mapWeek),
          createdAt: new Date(t.created_at as string)
        })
      }

      // Deduplicar por id (evita doblar si la tabla ya estaba en el fallback)
      const unique = enriched.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
      if (unique.length > 0) setTables(unique)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error cargando tablas nutricionales'
      setError(message)
      console.error('[NutritionTables] error:', e)
      // fallback already set as initial state
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
