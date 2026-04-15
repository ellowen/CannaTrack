# CannaTrack — Plan de acción para salir al mercado

---

## DÓNDE ESTÁS HOY

- Estructura monorepo lista
- Motor nutricional (Etapa 0) funcionando
- UI iniciada pero incompleta (Etapa 1 a medias)
- Trabajando solo
- Objetivo: producto comercializable para cultivadores y marcas

---

## FASE 1 — TERMINAR EL MVP (4–6 semanas)

Objetivo: tener algo que un cultivador real pueda usar todos los días.

### Semana 1–2: Completar la UI base

Orden estricto — no avanzar al siguiente hasta terminar el anterior:

1. **Stores con Zustand + localStorage**
   - plantStore, taskStore, nutritionStore, userStore
   - Sin esto nada funciona end-to-end

2. **Componentes UI base**
   - Button, Card, Badge, Input — los bloques de todo lo demás

3. **Página NewPlant**
   - Formulario completo: nombre, genética, tipo, fecha, macetas, tabla
   - Al guardar → genera el cronograma automáticamente

### Semana 3–4: Flujo principal

4. **Página Home**
   - Lista de plantas con acción urgente del día
   - Banner de próximo evento nutricional

5. **Página PlantDetail**
   - Próximas tareas con productos y dosis
   - Botón "Iniciar floración" (feminizada/regular)
   - Marcar tarea como completada

6. **React Router**
   - Conectar Home → NewPlant → PlantDetail

### Semana 5–6: Polish y validación

7. **Página Calendar** — vista mensual con eventos coloreados
8. **Registro de observaciones** — altura, EC, PH, notas
9. **Galería de fotos** — upload y vista por semana
10. **Probar con 3–5 cultivadores reales** — feedback antes de lanzar

**Prompt para arrancar esta fase:**
> "Actuá como Senior Frontend Developer en CannaTrack.
> Stack: Vite + React 18 + TypeScript + Tailwind + Zustand.
> Leé el CLAUDE.md adjunto. La Etapa 1 está iniciada.
> Quiero terminarla en orden: primero los stores, luego UI base,
> luego páginas. Empezamos por plantStore.ts con Zustand y
> persistencia en localStorage. Adjunto los tipos de plant.ts."

---

## FASE 2 — BACKEND Y LANZAMIENTO (3–4 semanas)

Objetivo: usuarios reales con datos en la nube, plan Pro activo.

### Semana 1–2: Supabase

- Auth de usuarios (email + Google)
- Migrar stores de localStorage a Supabase
- Storage de fotos de plantas
- RLS (Row Level Security) — cada usuario solo ve sus plantas

### Semana 3: Plan Free vs Pro

- Feature flags según plan del usuario
- Límite de 1 planta en Free
- Stripe o MercadoPago para cobrar Pro
- Landing page simple explicando los planes

### Semana 4: Lanzamiento beta

- Deploy en Vercel (frontend) + Supabase cloud (backend)
- Dominio propio (cannatrack.app o similar)
- Formulario de waitlist o acceso directo
- Compartir en grupos de cultivadores (Reddit, Telegram, Instagram)

---

## FASE 3 — MARKETPLACE B2B (después de 500 usuarios)

Objetivo: primer ingreso B2B con marcas de fertilizantes.

### Preparación técnica
- Panel de administración para cargar tablas de marcas
- Sistema de `accessTier` por tabla (free/pro)
- Página de marketplace dentro de la app

### Estrategia comercial con REVEGETAR
REVEGETAR ya es tu primer cliente potencial. Ellos tienen:
- Una tabla nutricional documentada (ya la tenés codificada)
- Interés en llegar a cultivadores de forma digital
- Presupuesto de marketing para canales nuevos

**Propuesta concreta para REVEGETAR:**
> "Tenemos [N] cultivadores activos usando tu tabla nutricional
> en CannaTrack todos los días. Podemos ofrecerte:
> - Tu logo y branding en la tabla dentro de la app
> - Link directo a tu tienda desde cada tarea de nutrición
> - Estadísticas de uso (cuántos cultivadores, qué etapas)
> Precio: USD 100/mes"

### Otras marcas a contactar
- Biobizz
- General Hydroponics
- Plagron
- Canna
- Marcas argentinas/latam del sector

---

## EQUIPO VIRTUAL — CÓMO USAR CLAUDE COMO EQUIPO

Trabajando solo, Claude es tu equipo. La clave es ser específico
sobre qué rol necesitás en cada momento.

### Para decisiones de producto (CEO/PM)
Cuando no sabés qué priorizar o cómo posicionarte:
```
Actuá como CEO/PM de CannaTrack.
Contexto: [estado actual del proyecto + métricas si las tenés]
Problema: [decisión que necesitás tomar]
Dame 3 opciones con pros y contras de cada una.
```

### Para arquitectura (CTO)
Cuando tenés que tomar decisiones técnicas importantes:
```
Actuá como CTO de CannaTrack.
Stack actual: Vite + React + Supabase (ver CLAUDE.md adjunto)
Necesito decidir: [decisión técnica]
Considerá: escalabilidad, mantenibilidad trabajando solo, tiempo de implementación.
```

### Para implementar features (Senior Dev)
Para cada feature, siempre adjuntá:
1. El CLAUDE.md
2. Los archivos de tipos (`types/plant.ts`)
3. El archivo específico a modificar o crear
4. Descripción clara de qué tiene que hacer

```
Actuá como Senior Frontend Developer en CannaTrack.
Leé el CLAUDE.md adjunto — seguí todas las convenciones.
Adjunto: [archivos relevantes]
Implementá: [feature específica]
Criterios: [qué tiene que pasar para que esté "done"]
```

### Para revisar código (QA)
Antes de hacer commit de algo importante:
```
Actuá como QA Senior en CannaTrack.
Revisá este código y decime:
1. Bugs o edge cases no cubiertos
2. Violaciones a las convenciones del CLAUDE.md
3. Tests de Vitest que faltan
[pegar código]
```

### Para el pitch a marcas (CMO)
Cuando necesitás armar la propuesta comercial:
```
Actuá como CMO de una startup SaaS en el sector cannabis.
CannaTrack tiene [N] usuarios activos usando la tabla de REVEGETAR.
Armá un email de 200 palabras para ofrecerles el plan listing.
Tono: directo, profesional, orientado a resultados.
```

---

## MÉTRICAS QUE IMPORTAN (para tomar decisiones)

Antes de monetizar, medí estas cosas. Sin datos no hay decisiones.

### Retención (la más importante)
- ¿El usuario vuelve al día siguiente? (Day 1 retention)
- ¿Sigue usando la app después de 2 semanas? (Day 14 retention)
- ¿Llega al final de un ciclo completo? (ciclo completo = 10–14 semanas)

### Engagement
- Tareas completadas por semana por usuario
- Fotos subidas por ciclo
- Notificaciones abiertas vs ignoradas

### Conversión Free → Pro
- ¿Qué feature hace que el usuario quiera pagar?
- ¿En qué momento del ciclo pide más plantas?

**Herramienta recomendada (gratis):** PostHog — analytics de producto
open source, se integra fácil con React, no tiene límite de eventos en el plan free.

---

## RIESGOS Y CÓMO MITIGARLOS

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Quedarse sin tiempo trabajando solo | Alta | Usar Claude Code agresivamente para velocity |
| Nadie paga el plan Pro | Media | Validar con usuarios antes de implementar Stripe |
| Las marcas no pagan listing | Media | Lanzar primero con REVEGETAR gratis para tener caso de éxito |
| Competidor copia la idea | Baja | La ventaja no es la idea, es la comunidad y los datos |
| Problemas legales por tema cannabis | Baja | App de seguimiento de cultivo, no de venta — legal en casi todos lados |

---

## RECOMENDACIONES FINALES

**Lo más importante ahora mismo:**

1. **Terminá la Etapa 1 esta semana** — aunque sea fea, que funcione end-to-end.
   Un usuario real usando algo imperfecto vale más que código perfecto sin usuarios.

2. **Poné el CLAUDE.md en la raíz del repo hoy** — cada sesión de Claude
   va a ser 3x más efectiva con este contexto.

3. **No arranques Supabase hasta tener 10 usuarios reales** — localStorage
   es suficiente para validar. El backend agrega complejidad antes de necesitarla.

4. **Contactá a REVEGETAR antes de tener el producto terminado** —
   mostrales el demo del motor nutricional con su tabla. Si les interesa,
   construís el resto sabiendo que tenés el primer cliente.

5. **Una sesión de Claude = una tarea concreta** — no pidas "ayudame con el proyecto".
   Pedí "implementá plantStore.ts con Zustand y localStorage según el CLAUDE.md adjunto".

---

*CannaTrack — De MVP a producto comercializable*
*Tiempo estimado para estar listo para el mercado: 8–10 semanas*
