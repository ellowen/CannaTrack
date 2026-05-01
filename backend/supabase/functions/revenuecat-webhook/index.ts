import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Webhook de RevenueCat — sincroniza is_pro en profiles.
 *
 * Configuracion en RevenueCat:
 *   Dashboard > Project > Integrations > Webhooks
 *   URL: https://<project>.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization: <REVENUECAT_WEBHOOK_SECRET>
 *
 * Variable de entorno requerida en Supabase:
 *   REVENUECAT_WEBHOOK_SECRET  — string libre que configuras en el dashboard de RC
 */

// Eventos que activan el plan Pro
const PRO_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'PRODUCT_CHANGE',
  'TRANSFER',
  'SUBSCRIBER_ALIAS',
])

// Eventos que desactivan el plan Pro
const PRO_INACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
])

type RCEvent = {
  type:        string
  app_user_id: string
  aliases?:    string[]
  entitlements?: Record<string, { expires_date: string | null }>
}

type RCPayload = {
  event:       RCEvent
  api_version: string
}

serve(async (req) => {
  // Solo POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verificar el secreto del webhook
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (secret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== secret) {
      console.warn('[rc-webhook] Authorization invalida')
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: RCPayload
  try {
    payload = await req.json() as RCPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const event = payload.event
  if (!event?.type || !event?.app_user_id) {
    return new Response('Missing event fields', { status: 400 })
  }

  console.log(`[rc-webhook] ${event.type} — user: ${event.app_user_id}`)

  // Determinar si el evento cambia el estado Pro
  const activate   = PRO_ACTIVE_EVENTS.has(event.type)
  const deactivate = PRO_INACTIVE_EVENTS.has(event.type)

  if (!activate && !deactivate) {
    // Evento desconocido — logear y responder 200 para que RC no reintente
    console.log(`[rc-webhook] Evento ignorado: ${event.type}`)
    return new Response('OK', { status: 200 })
  }

  // Para BILLING_ISSUE y CANCELLATION, verificar si el entitlement pro
  // todavia tiene expires_date en el futuro (periodo de gracia).
  let isPro = activate
  if (deactivate && event.entitlements?.pro?.expires_date) {
    const expires = new Date(event.entitlements.pro.expires_date)
    if (expires > new Date()) {
      // Todavia dentro del periodo de gracia — mantener Pro
      isPro = true
      console.log(`[rc-webhook] Periodo de gracia activo hasta ${expires.toISOString()}`)
    }
  }

  // Recolectar todos los user IDs que hay que actualizar
  // (app_user_id + aliases pueden ser el mismo usuario)
  const userIds = Array.from(new Set([
    event.app_user_id,
    ...(event.aliases ?? []),
  ]))

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Actualizar todos los IDs en paralelo
  const results = await Promise.allSettled(
    userIds.map(uid =>
      adminClient
        .from('profiles')
        .update({ is_pro: isPro })
        .eq('id', uid)
    )
  )

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    console.error(`[rc-webhook] ${errors.length} errores al actualizar profiles`)
    errors.forEach(e => console.error(e))
  }

  const updated = results.filter(r => r.status === 'fulfilled').length
  console.log(`[rc-webhook] ${event.type} — is_pro=${isPro} — ${updated}/${userIds.length} profiles actualizados`)

  return new Response(JSON.stringify({ ok: true, isPro, updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
