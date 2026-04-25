# Quick Start — Ejecutar Migrations

## 1. Prerequisitos

```bash
# Verificar Supabase CLI instalado
supabase --version

# Si no está instalado
npm install -g supabase
```

## 2. Autenticación

```bash
# Login a Supabase
supabase login

# Link al proyecto (una sola vez)
supabase link --project-ref [PROJECT_REF]
# Ej: supabase link --project-ref abcdefghijklmnop
```

## 3. Ejecutar Migrations

```bash
# Cambiar a directorio correcto
cd /c/Dev/CannaTrack/backend/supabase

# Ejecutar todas las migrations
supabase db push

# Esperado:
# ✓ 20260424_01_init_schema.sql
# ✓ 20260424_02_nutrition_tables.sql
# ✓ 20260424_03_gamification.sql
# ✓ 20260424_04_rls_policies.sql
# All migrations complete
```

## 4. Verificar en Dashboard

Ir a: https://app.supabase.com/project/[PROJECT_ID]/sql

Ejecutar:
```sql
-- Listar tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar seed data REVEGETAR
SELECT COUNT(*) FROM nutrition_weeks WHERE table_id = 'revegetar';
-- Esperado: 14
```

## 5. Si Algo Falla

```bash
# Ver logs
supabase db pull

# Revertir últimas changes locales
supabase db reset

# O ejecutar manualmente en Dashboard SQL Editor
# (copiar contenido de cada .sql en orden)
```

## Documentación Completa

- **README_MIGRATIONS.md** — Resumen + estadísticas
- **MIGRATIONS_CHECKLIST.md** — Validación detallada
- **PUSH_INSTRUCTIONS.md** — Troubleshooting
- **ENTREGABLE.txt** — Resumen ejecutivo

## Próximo Paso

Después de push exitoso:
1. Conectar frontend con Supabase client
2. Implementar auth flow
3. Crear Edge Functions para uploads
