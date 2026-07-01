// SETUP:
// 1. Generar claves VAPID (una sola vez):
//    cd backend && npx web-push generate-vapid-keys
// 2. Configurar secrets en Supabase (NUNCA commitear estas claves):
//    supabase secrets set VAPID_PUBLIC_KEY=<public-key-generada>
//    supabase secrets set VAPID_PRIVATE_KEY=<private-key-generada>
//    supabase secrets set VAPID_EMAIL=mailto:lucazrubio@gmail.com
// 3. Pegar la public key en frontend/src/lib/notifications.ts (constante VAPID_PUBLIC_KEY)
// 4. Deploy: supabase functions deploy send-daily-push
// 5. Programar via Supabase Dashboard -> Database -> Extensions -> pg_cron:
//    SELECT cron.schedule('send-push-hourly', '0 * * * *', $$
//      SELECT net.http_post(
//        url := current_setting('app.supabase_url') || '/functions/v1/send-daily-push',
//        headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
//      );
//    $$);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

serve(async () => {
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidEmail   = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@cannatrack.app'

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

  const supabase = createClient(supabaseUrl, serviceKey)
  const currentHour = new Date().getUTCHours()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('reminder_hour', currentHour)

  if (!subs || subs.length === 0) {
    return new Response('No subs for this hour', { status: 200 })
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const results = await Promise.allSettled(subs.map(async (sub) => {
    const { count } = await supabase
      .from('scheduled_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', sub.user_id)
      .eq('completed', false)
      .gte('scheduled_date', todayStr)
      .lt('scheduled_date', tomorrowStr)

    if (!count || count === 0) return

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }

    const payload = JSON.stringify({
      title: `\u{1F33F} ${count} tarea${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''} hoy`,
      body: 'Abri CannaTrack para ver el detalle',
      url: '/',
    })

    await webpush.sendNotification(pushSub, payload)
  }))

  const failed = results.filter((r) => r.status === 'rejected').length
  return new Response(
    JSON.stringify({ sent: results.length - failed, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
