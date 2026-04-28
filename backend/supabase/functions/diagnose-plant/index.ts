import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Sesion invalida' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { image, plantId } = await req.json() as { image: string; plantId?: string }

    if (!image || image.length < 100) {
      return new Response(JSON.stringify({ error: 'Imagen invalida' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

    // Detectar media type de la imagen (jpeg por defecto)
    const mediaType = image.startsWith('/9j/') ? 'image/jpeg'
      : image.startsWith('iVBOR') ? 'image/png'
      : 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          apiKey,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5',
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            { type: 'text', text: USER_PROMPT },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic error ${response.status}: ${err}`)
    }

    const data      = await response.json()
    const rawText   = (data.content[0].text as string).trim()

    // Extraer JSON — tolera que Claude agregue whitespace o un bloque de código
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Respuesta de IA no contiene JSON valido')

    const result = JSON.parse(jsonMatch[0]) as {
      summary: string
      healthScore: number
      issues: { name: string; severity: string; description: string; solution: string }[]
      recommendations: string[]
    }

    // Validar estructura mínima
    if (typeof result.healthScore !== 'number') result.healthScore = 50
    if (!Array.isArray(result.issues))          result.issues = []
    if (!Array.isArray(result.recommendations)) result.recommendations = []

    // Guardar diagnostico en week_logs como entrada de diario (opcional, no bloquea la respuesta)
    if (plantId) {
      const issueCount = result.issues.length
      const notes = issueCount > 0
        ? `Diagnostico IA: ${result.summary} (${issueCount} problema${issueCount > 1 ? 's' : ''} detectado${issueCount > 1 ? 's' : ''})`
        : `Diagnostico IA: ${result.summary}`

      supabase.from('week_logs').insert({
        plant_id:   plantId,
        user_id:    user.id,
        week_label: 'Diagnostico IA',
        log_date:   new Date().toISOString().split('T')[0],
        notes,
        photo_url:  null,
      }).then(() => {/* fire and forget */})
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[diagnose-plant]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
