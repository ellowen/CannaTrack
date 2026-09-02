import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Elimina la cuenta del usuario autenticado (App Store guideline 5.1.1(v) --
// borrado de cuenta desde la app, no solo cerrar sesion / contactar soporte).
//
// La mayoria de las tablas tienen `user_id ... references auth.users on
// delete cascade`, asi que borrar el usuario en Auth ya se lleva puestas
// plants, scheduled_tasks, measurements, week_logs, ai_usage,
// diagnosis_logs, gamification, trial/subscripcion, etc. Lo unico que NO
// cae con el cascade es Storage (no es una tabla de Postgres), asi que las
// fotos se borran a mano antes de borrar el usuario.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autorizado' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Sesion invalida' }, 401)

  try {
    await deleteUserPhotos(adminClient, user.id)

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteErr) throw deleteErr

    return json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[delete-account]', msg)
    return json({ error: msg }, 500)
  }
})

// deno-lint-ignore no-explicit-any
async function deleteUserPhotos(adminClient: any, userId: string): Promise<void> {
  const { data: plantFolders, error: listErr } = await adminClient
    .storage
    .from('plant-photos')
    .list(userId)

  if (listErr) {
    console.error('[delete-account] error listando fotos:', listErr.message)
    return
  }
  if (!plantFolders?.length) return

  const paths: string[] = []
  for (const folder of plantFolders) {
    // Los "archivos" sin id son en realidad subcarpetas (una por planta)
    if (folder.id === null) {
      const { data: files } = await adminClient
        .storage
        .from('plant-photos')
        .list(`${userId}/${folder.name}`)
      for (const file of files ?? []) {
        paths.push(`${userId}/${folder.name}/${file.name}`)
      }
    } else {
      paths.push(`${userId}/${folder.name}`)
    }
  }

  if (paths.length > 0) {
    const { error: removeErr } = await adminClient.storage.from('plant-photos').remove(paths)
    if (removeErr) console.error('[delete-account] error borrando fotos:', removeErr.message)
  }
}
