# CannaTrack — Backend

Basado en Supabase (PostgreSQL + Auth + Storage + Edge Functions).

## Stack
- Supabase (BaaS)
- PostgreSQL para datos
- Supabase Auth para usuarios
- Supabase Storage para fotos de plantas
- Edge Functions para lógica server-side (notificaciones, IA)

## Setup (Etapa 2)
```bash
npm install -g supabase
supabase init
supabase start
```

## Tablas principales
- users
- plants
- nutrition_tables
- brands
- scheduled_tasks
- observations
- photos
- notifications

## Migraciones
Las migraciones están en `/supabase/migrations/`
