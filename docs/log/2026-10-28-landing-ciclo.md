# 2026-10-28 — Landing "El ciclo"

## Que se hizo
- Hilo del ciclo (`LandingStem`): un tallo recorre toda la pagina y se dibuja con el scroll; brota una hoja en cada seccion con `data-stem`. Publica `--lp-p` (0 a 1) y una capa fija (`.lp-tint`) pasa del verde del vegetativo al dorado de la floracion.
- Hero con mockup de la pantalla "Hoy" (`AppMockup`, armado a mano, sin stores) y la planta SVG dibujandose sola detras (`GrowthLines draw`).
- Problema: cuaderno con notas contra la app resolviendo cada pregunta (antes/despues).
- Demo interactiva (`CycleDemo`, chunk aparte via `lazy`): control de dia 1 a 98 con la tabla REVEGETAR real (etapa, EC, pH, productos con dosis). Se mueve sola hasta la floracion al entrar en pantalla y se frena al tocarla.
- Funcionalidades en bento (`Bento.tsx`): cada celda con una mini-UI (calendario, offline, geneticas, diario, EC/pH, nivel y racha).
- Tipografia: se saco el `!important` de peso sobre Fraunces, itálica para la palabra clave del titulo (`@fontsource-variable/fraunces/wght-italic.css`).
- Credibilidad: B2B pasa a una banda corta "Pronto" sin stats; el boton de Pro ya no esta deshabilitado (lleva a `/signup`, "30 dias de Pro gratis al crear tu cuenta"); el "+18" del footer deja de ser un link a `#`.
- CTA fijo en mobile (aparece tras 640px de scroll); el CTA del header se oculta en mobile.
- Estilos de la landing en `components/landing/landing.css` (clases `lp-*`), textos nuevos en `landing.*` de es/en.
- Tests: 7 nuevos en `e2e/landing.spec.ts` (mockup, demo, atajos y EN, hilo dibujado, Pro, CTA mobile, sin scroll horizontal).

## Por que
La landing repetia el mismo patron (titulo centrado + grilla de tarjetas), no mostraba el producto y tenia un boton muerto y stats de B2B sobre algo que todavia no existe.

## Pendiente / siguiente paso
- El texto "30 dias de Pro gratis" asume el trial del alta; confirmar con el flujo real de cobro antes de promocionarlo.
- La demo usa `REVEGETAR_TABLE` directo (no `generatePlantSchedule`): muestra la semana de la tabla, no fechas.
- WebKit (iPhone) no corre en local: lo valida el CI.
- URL real de produccion sin confirmar: `canna-track-frontend.vercel.app` (repo) vs `cultitrack.vercel.app` (canonical de `index.html`).
