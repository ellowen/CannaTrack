# CannaTrack Supabase Migrations — Semana 5

## 📋 Resumen

Se han creado **4 archivos de migration** que implementan el schema completo de CannaTrack para Etapa 2 (Backend Supabase).

| Archivo | Descripción | Líneas | Tablas | Funciones |
|---------|-----------|--------|--------|----------|
| `20260424_01_init_schema.sql` | Schema base (perfiles, plantas, tareas) | 190 | 5 | 1 |
| `20260424_02_nutrition_tables.sql` | Tablas nutricionales + seed REVEGETAR | 150 | 3 | 0 |
| `20260424_03_gamification.sql` | XP, levels, streaks, triggers | 255 | 2 | 3 |
| `20260424_04_rls_policies.sql` | RLS consolidado + funciones de utilidad | 164 | 0 | 4 |
| **TOTAL** | | **759** | **10** | **8** |

---

## 📊 Tablas Creadas (10)

```
USUARIOS & PLANTAS
├─ profiles (usuario con XP/streak)
└─ plants (plantas del usuario)

CALENDARIO & MEDICIONES
├─ scheduled_tasks (tareas programadas)
├─ measurements (EC/pH medidos)
└─ week_logs (diario semanal con fotos)

TABLAS NUTRICIONALES (Catálogo público)
├─ nutrition_tables (marcas: REVEGETAR, etc)
├─ nutrition_weeks (14 semanas: vege+flora)
└─ nutrition_products (20 productos REVEGETAR)

GAMIFICACIÓN
├─ user_xp_log (historial de XP por acción)
└─ user_streaks (racha de días)

STORAGE
└─ storage.buckets["plant-photos"] (fotos del cultivo)
```

---

## 🎮 Gamificación Implementada

### XP Awards
- `task_completed`: 5-50 XP (según tipo)
- `photo_uploaded`: 15 XP
- `plant_harvested`: 50 XP
- Bonus: 25 XP cada 5 días de racha

### Sistema de Niveles (10 niveles)
```
L1:  0-100 XP    (principiante)
L2:  100-300 XP  (+200 needed)
L3:  300-600 XP  (+300 needed)
L4:  600-1000 XP (+400 needed)
L5:  1000-1500   (+500 needed)
L6:  1500-2100   (+600 needed)
L7:  2100-2800   (+700 needed)
L8:  2800-3600   (+800 needed)
L9:  3600-4500   (+900 needed)
L10: 4500+ XP     (máximo)
```

### Racha de Días
- Incrementa si completa tareas mismo día
- Reset si no completa (después de 1 día)
- Max streak registrado

---

## 📅 Tabla REVEGETAR (Seed Data)

### Ciclo Vegetativo (6 semanas)
| Week | Stage | EC | PH | Duración |
|------|-------|----|----|----------|
| S1 | Enraizado | 0.4-0.6 | 5.5-6.0 | 7d |
| S2 | Enraizado | 0.5-0.7 | 5.5-6.0 | 7d |
| S3 | Crecimiento | 0.6-0.8 | 5.5-6.0 | 7d |
| S4 | Crecimiento | 0.7-0.9 | 5.5-6.0 | 7d |
| S5 | Prefloración | 0.8-1.0 | 5.5-6.0 | 7d |
| S6 | Prefloración | 0.9-1.1 | 5.5-6.0 | 7d |

### Ciclo Floración (8 semanas)
| Week | Stage | EC | PH | Duración |
|------|-------|----|----|----------|
| F1 | Estiramiento | 1.0-1.2 | 6.0-6.5 | 7d |
| F2 | Estiramiento | 1.0-1.2 | 6.0-6.5 | 7d |
| F3 | Engorde | 1.1-1.3 | 6.0-6.5 | 7d |
| F4 | Engorde | 1.2-1.4 | 6.0-6.5 | 7d |
| F5 | Maduración | 1.3-1.5 | 6.0-6.5 | 7d |
| F6 | Maduración | 1.4-1.6 | 6.0-6.5 | 7d |
| F7 | Limpieza | 0.2-0.4 | 6.0-6.5 | 7d |
| F8 | Limpieza | 0.0-0.2 | 6.0-6.5 | 7d |

### Productos (20 total)
| Línea | Productos | Descripción |
|-------|-----------|-----------|
| **BIO** | 5 | Bioestimulantes ecológicos |
| **ECO** | 4 | Abonos orgánicos |
| **LIFE** | 4 | Controladores biológicos |
| **FUEL** | 4 | Bases minerales |

---

## 🔐 Row Level Security (RLS)

**Habilitado en:**
- ✓ profiles (usuario solo ve su perfil)
- ✓ plants (usuario solo ve sus plantas)
- ✓ scheduled_tasks (usuario solo ve sus tareas)
- ✓ measurements (usuario solo ve sus mediciones)
- ✓ week_logs (usuario solo ve sus logs)
- ✓ user_xp_log (usuario solo lee su historial)
- ✓ user_streaks (usuario solo ve su racha)
- ✓ nutrition_* (lectura pública)
- ✓ storage.objects (fotos: usuario solo sube/lee/elimina las suyas)

**Total: 20+ políticas**

---

## ⚙️ Funciones Creadas (8)

### Triggers automáticos
1. **handle_new_user()** — Crea profile cuando se registra usuario
2. **handle_task_completion()** — Asigna XP y actualiza racha al completar tarea
3. **handle_photo_upload()** — (Preparada) Asigna XP al subir foto

### Funciones de utilidad
4. **get_level_info(xp)** — Retorna nivel actual + progreso
5. **get_user_level()** — Resumen de nivel del usuario actual
6. **get_user_summary()** — Dashboard: username, xp, plants, tasks completadas hoy
7. **is_plant_owner(uuid)** — Verifica si usuario es dueño de planta
8. **is_task_owner(uuid)** — Verifica si usuario es dueño de tarea

---

## 📦 Índices Creados (10)

Para optimizar queries:
- `idx_plants_user` — Listar plantas por usuario
- `idx_tasks_user` — Listar tareas por usuario
- `idx_tasks_plant` — Listar tareas por planta
- `idx_tasks_date` — Filtrar tareas por fecha
- `idx_measurements_plant` — Historial EC/pH por planta
- `idx_week_logs_plant` — Historial semanal por planta
- `idx_nutrition_weeks_table` — Listar semanas por tabla
- `idx_nutrition_products_table` — Listar productos por tabla
- `idx_xp_log_user` — Historial XP por usuario
- `idx_xp_log_plant` — Historial XP por planta

---

## 🚀 Ejecución

### Con Supabase CLI (Recomendado)
```bash
cd backend/supabase
supabase db push
```

### Manualmente en Dashboard
1. Ir a SQL Editor
2. Copiar contenido de cada archivo (en orden)
3. Click RUN para cada uno

Ver detalles en: **PUSH_INSTRUCTIONS.md**

---

## ✅ Validación Post-Push

Ver script de validación en: **MIGRATIONS_CHECKLIST.md**

Comandos clave:
```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Verificar data REVEGETAR
SELECT COUNT(*) FROM nutrition_weeks WHERE table_id = 'revegetar';
-- Esperado: 14

-- Test: completar tarea y verificar XP
UPDATE scheduled_tasks SET completed = true WHERE id = '...'
SELECT * FROM user_xp_log ORDER BY created_at DESC LIMIT 1;
```

---

## 📝 Archivos Relacionados

- **MIGRATIONS_CHECKLIST.md** — Detalle completo de cada migración
- **PUSH_INSTRUCTIONS.md** — Como ejecutar y validar
- **migrations/** — Archivos SQL (4 archivos)

---

## 🔄 Rollback (si es necesario)

Cada archivo contiene su comentario de rollback:
```sql
-- Rollback: DROP TABLE IF EXISTS tabla CASCADE;
```

Ver instrucciones en **PUSH_INSTRUCTIONS.md**

---

## 📊 Estadísticas

- **Tablas**: 10
- **Funciones**: 8 (7 públicas + 1 trigger)
- **Triggers**: 3
- **Políticas RLS**: 20+
- **Índices**: 10
- **Seed data**: 1 tabla completa (REVEGETAR)
  - 14 semanas nutricionales
  - 20 productos en 4 líneas
  - EC/PH ranges por etapa

---

## 🎯 Próximos pasos

1. ✅ Crear migrations (HECHO)
2. ⏳ Ejecutar `supabase db push`
3. ⏳ Validar en dashboard
4. ⏳ Conectar frontend a Supabase
5. ⏳ Crear Edge Functions para uploads
6. ⏳ Implementar Realtime subscriptions

---

## 📚 Referencias

- Docs Supabase: https://supabase.com/docs
- Migrations CLI: https://supabase.com/docs/guides/cli/managing-databases
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Edge Functions: https://supabase.com/docs/guides/functions

---

**Repo:** https://github.com/ellowen/CannaTrack.git  
**Proyecto:** CannaTrack Semana 5 — Backend Etapa 2  
**Fecha:** 2026-04-23
