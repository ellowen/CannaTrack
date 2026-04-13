# Edge Functions — Etapa 2+

Funciones serverless que se ejecutan en el edge de Supabase.

## Planificadas

### `send-notifications`
Cron job diario que revisa las tareas del día siguiente
y envía notificaciones push a los usuarios.

### `ai-diagnosis`
Recibe una foto de planta, llama a la API de Claude (vision)
con un prompt especializado en deficiencias de cannabis,
y devuelve el diagnóstico con recomendaciones de productos.

### `generate-schedule`
Regenera el cronograma completo de una planta cuando
el usuario registra el inicio de floración.
