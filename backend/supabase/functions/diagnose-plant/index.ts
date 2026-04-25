import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { imageUrl, plantId } = await req.json() as { imageUrl: string; plantId: string }

  // Verificar que la planta pertenece al usuario
  const { data: plant } = await supabase
    .from('plants')
    .select('name, genetics, genetic_type')
    .eq('id', plantId)
    .eq('user_id', user.id)
    .single()

  if (!plant) return new Response('Plant not found', { status: 404, headers: corsHeaders })

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `Analiza esta foto de una planta de cannabis. La planta se llama "${plant.name}" (${plant.genetics}, tipo: ${plant.genetic_type}).

Responde SOLO en JSON con esta estructura exacta, sin markdown:
{
  "summary": "descripcion breve del estado general en 1-2 oraciones",
  "issues": ["problema 1", "problema 2"],
  "recommendations": ["accion 1", "accion 2"],
  "severity": "ok" | "warning" | "critical"
}

Evalua: color de hojas, posibles deficiencias nutricionales, plagas, hongos, quemaduras, signos de estrés. Si la planta parece saludable, issues puede ser array vacio.`,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = {
      summary: 'No se pudo analizar la imagen correctamente.',
      issues: [],
      recommendations: ['Tomá una foto mas clara con buena iluminacion.'],
      severity: 'warning',
    }
  }

  // Guardar diagnostico en historial
  await supabase.from('plant_diary').insert({
    plant_id: plantId,
    user_id: user.id,
    date: new Date().toISOString(),
    note: `[IA] ${parsed.summary}`,
    photo_url: imageUrl,
    type: 'observation',
  })

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
