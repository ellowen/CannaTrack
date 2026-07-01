// SETUP (one-time, run from terminal):
//
// 1. Generar VAPID keys:
//    cd backend && npx web-push generate-vapid-keys
//
// 2. Guardar secrets en Supabase (NUNCA en git):
//    supabase secrets set VAPID_PUBLIC_KEY=<public-key>
//    supabase secrets set VAPID_PRIVATE_KEY=<private-key>
//    supabase secrets set VAPID_EMAIL=mailto:lucazrubio@gmail.com
//
// 3. Reemplazar VAPID_PUBLIC_KEY en frontend/src/lib/notifications.ts
//
// 4. Deploy:
//    supabase functions deploy send-daily-push
//
// 5. Programar via Supabase Dashboard -> Database -> Cron Jobs:
//    Name: send-push-hourly
//    Schedule: 0 * * * *
//    Command: SELECT net.http_post(
//      url := 'https://<ref>.supabase.co/functions/v1/send-daily-push',
//      headers := jsonb_build_object(
//        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
//      )
//    );

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// deno-lint-ignore-file no-explicit-any
import webpush from 'npm:web-push@3'

serve(async () => {
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidEmail      = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@cannatrack.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response('VAPID keys not configured', { status: 500 })
  }

  ;(webpush as any).setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

  const supabase    = createClient(supabaseUrl, serviceKey)
  const currentHour = new Date().getUTCHours()

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('reminder_hour', currentHour)

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500 })
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'no subs for this hour' }), { status: 200 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const results = await Promise.allSettled(
    subs.map(async (sub: any) => {
      const { count } = await supabase
        .from('scheduled_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sub.user_id)
        .eq('completed', false)
        .eq('scheduled_date', todayStr)

      if (!count || count === 0) return 'skipped'

      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }

      const payload = JSON.stringify({
        title: `🌿 ${count} tarea${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''} hoy`,
        body: 'Abrí CannaTrack para ver el detalle',
        url: '/',
      })

      await (webpush as any).sendNotification(pushSub, payload)
      return 'sent'
    })
  )

  const sent   = results.filter((r) => r.status === 'fulfilled' && r.value === 'sent').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return new Response(
    JSON.stringify({ sent, failed, total: subs.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
