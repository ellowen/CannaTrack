# CannaTrack — Roadmap

## Etapa 0 — Motor nutricional ✅
- Estructura monorepo
- Tipos TypeScript
- Tablas nutricionales como datos (REVEGETAR)
- Motor `generatePlantSchedule` agnóstico a la marca
- Utilidades de nutrición
- Tests Vitest
- Script demo de consola

## Etapa 1 — UI React + localStorage ⏳
- Stores Zustand con persistencia en localStorage
- Componentes UI base (Button, Card, Badge)
- Página Home con tareas del día
- Página NewPlant con formulario
- Página PlantDetail con cronograma y botón "Iniciar floración"
- Página Calendar con vista mensual
- React Router conectando todo

## Etapa 2 — Backend Supabase ⏳
- Autenticación de usuarios
- Sincronización de plantas y tareas en PostgreSQL
- Marketplace de tablas nutricionales por marca
- Storage de fotos por planta
- Edge Function: notificaciones diarias
- Edge Function: diagnóstico IA con Claude Vision

## Etapa 3 — App mobile Expo ⏳
- Reutilización de `src/lib/` y `src/data/`
- Notificaciones push nativas
- Cámara integrada para fotos de plantas
- Modo offline con sincronización posterior
