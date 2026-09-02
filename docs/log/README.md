# Session Log

Un archivo por sesion de trabajo relevante (no cada dia — solo cuando paso
algo que otra sesion/maquina necesita saber). Objetivo: que retomar el
proyecto desde otra maquina no dependa de la memoria del usuario ni de
docs estaticos que se desactualizan (ver `docs/archive-abril2026/`).

## Convencion

Nombre: `YYYY-MM-DD-slug-corto.md`

Contenido minimo:

```md
# YYYY-MM-DD — Titulo corto

## Que se hizo
- bullet, no parrafo

## Por que
1-2 lineas si no es obvio del "que se hizo"

## Pendiente / siguiente paso
- que quedo a mitad, que decidir, que probar
```

## Regla para Claude

Al cerrar una sesion con cambios no triviales (no un typo, no una pregunta
respondida), crear una entrada aca antes de terminar. Si la sesion arranca
y hay entradas nuevas desde la ultima vez que el usuario las vio, resumirlas
en la respuesta de arranque en vez de asumir que el usuario se acuerda.
