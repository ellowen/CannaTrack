import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Limites mensuales de diagnosticos por plan
const LIMITS = { free: 5, pro: 30 }

const SYSTEM_PROMPT = `Sos un experto agrónomo especializado en cannabis con amplio conocimiento en:
- Deficiencias y toxicidades de macronutrientes (N, P, K) y micronutrientes (Ca, Mg, Fe, Mn, Zn)
- Enfermedades fúngicas: oídio, botritis, fusarium, pythium
- Plagas: araña roja, trips, fungus gnats, pulgones, cochinillas
- Estrés abiótico: quemaduras por luz/calor, sobrerriego, pH fuera de rango, raíces ligadas
- Diferenciación entre síntomas visuales similares

Analiza la imagen con criterio técnico. Si la planta se ve sana, lo decis directamente.`

const USER_PROMPT = `Analiza esta foto de planta de cannabis y devolvé ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin texto extra, solo el JSON):

{
  "summary": "descripcion general del estado visible de la planta en 1-2 oraciones",
  "healthScore": 85,
  "issues": [
    {
      "name": "nombre del problema detectado",
      "severity": "alta",
      "description": "que es, por que ocurre y que parte de la planta afecta",
      "solution": "pasos concretos para solucionarlo"
    }
  ],
  "recommendations": [
    "recomendacion preventiva o de mejora 1",
    "recomendacion 2"
  ]
}

Reglas:
- healthScore: 0-100 (100 = planta perfecta, 0 = planta muerta)
- severity: solo "alta", "media" o "baja"
- issues: array vacio [] si la planta se ve sana
- recommendations: 2-4 recomendaciones siempre, aunque la planta este sana
- Todo en español rioplatense
- JSON puro, sin comentarios`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autorizado' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  // Cliente admin para operaciones de rate limiting (sin RLS)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Sesion invalida' }, 401)

  try {
    const { image, plantId } = await req.json() as { image: string; plantId?: string }

    if (!image || image.length < 100) return json({ error: 'Imagen invalida' }, 400)

    // ── Rate limiting ──────────────────────────────────────────────
    const month = new Date().toISOString().slice(0, 7)  // '2026-04'

    // Verificar plan del usuario
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single()

    const isPro = profile?.is_pro ?? false
    const limit = isPro ? LIMITS.pro : LIMITS.free

    // Upsert del contador mensual
    const { data: usage, error: usageErr } = await adminClient
      .from('ai_usage')
      .upsert(
        { user_id: user.id, month, diagnosis_count: 0 },
        { onConflict: 'user_id,month', ignoreDuplicates: false }
      )
      .select('diagnosis_count')
      .single()

    if (usageErr) console.error('[rate-limit] upsert error:', usageErr.message)

    const currentCount = usage?.diagnosis_count ?? 0
    if (currentCount >= limit) {
      return json({
        error: `Limite mensual alcanzado (${limit} diagnosticos/${isPro ? 'Pro' : 'Free'})`,
        limitReached: true,
        used: currentCount,
        limit,
      }, 429)
    }

    // Incrementar contador antes de llamar a Anthropic
    await adminClient
      .from('ai_usage')
      .update({ diagnosis_count: currentCount + 1 })
      .eq('user_id', user.id)
      .eq('month', month)

    // ── Llamada a Anthropic ────────────────────────────────────────
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

    const mediaType = image.startsWith('/9j/') ? 'image/jpeg'
      : image.startsWith('iVBOR') ? 'image/png'
      : 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5',
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: USER_PROMPT },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic error ${response.status}: ${err}`)
    }

    const data    = await response.json()
    const rawText = (data.content[0].text as string).trim()

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Respuesta de IA no contiene JSON valido')

    const result = JSON.parse(jsonMatch[0]) as {
      summary: string
      healthScore: number
      issues: { name: string; severity: string; description: string; solution: string }[]
      recommendations: string[]
    }

    if (typeof result.healthScore !== 'number') result.healthScore = 50
    if (!Array.isArray(result.issues))          result.issues = []
    if (!Array.isArray(result.recommendations)) result.recommendations = []

    // ── Guardar en diagnosis_logs (fire and forget) ────────────────
    if (plantId) {
      adminClient.from('diagnosis_logs').insert({
        user_id:         user.id,
        plant_id:        plantId,
        photo_url:       '',
        health_score:    result.healthScore,
        summary:         result.summary,
        issues:          result.issues,
        recommendations: result.recommendations,
      }).then(() => {/* fire and forget */})
    }

    // Incluir info de uso en la respuesta para que el cliente pueda mostrarla
    return json({
      ...result,
      _usage: { used: currentCount + 1, limit, isPro },
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[diagnose-plant]', msg)
    return json({ error: msg }, 500)
  }
})
