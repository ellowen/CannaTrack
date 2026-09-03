# 2026-09-03 — Mobile lista para stores: los 4 bloqueantes P0

## Que se hizo
Auditoria completa de mobile de cara a subir a App Store / Play Store
(3 agentes en paralelo: paridad de features + branding, compliance +
bugs conocidos, assets/build/calidad). Se decidio posicionamiento
"multi-cultivo al frente" (no cannabis explicito) para minimizar
riesgo de rechazo en review y habilitar pauta/organico en redes.

Los 4 bloqueantes P0 identificados, todos resueltos y pusheados:

1. **Rebranding CannaTrack -> Cultitrack** (`647d4c5`) — config,
   ~20 strings de UI, storage keys, `android/` regenerado con
   `expo prebuild --clean` (el paquete nativo ya estaba desincronizado
   de la config antes de este cambio).
2. **Eliminar cuenta** (`eed0480`) — Apple exige borrado de cuenta
   desde la app (guideline 5.1.1(v)). Edge function nueva
   (`delete-account`) + boton real en mobile y en web (la web tenia
   un "limpiar datos" que ni tocaba el servidor).
3. **Multi-cultivo en mobile** (`495a3dd`) — selector de tipo de
   cultivo en `plants/new.tsx`, sin el cual el rebranding "multi-cultivo"
   no era real en la app.
4. **Ingles en mobile** (`8caac9b`, `f7720dd`) — mobile no tenia
   framework de i18n. Se instalo i18next + react-i18next (mismo patron
   que la web), se tradujeron las ~22 pantallas/componentes en 9
   sesiones en paralelo (cada una a su propio archivo para no pisarse),
   se fusiono todo, y se agrego un test permanente
   (`src/i18n/__tests__/keys.test.ts`) que escanea cada `t('ns.key')`
   de la app y confirma que exista de verdad en es.ts Y en.ts. De
   yapa: `date-fns` formateaba fechas siempre en español sin importar
   el idioma — agregado `dateLocale.ts` y conectado en 13 archivos.

## Por que
El usuario quiere subir mobile a las stores con la misma confianza que
ya tiene en la webapp. La auditoria encontro que "cannabis" en el
nombre/branding es una bandera roja real para Apple y un bloqueo
directo para pauta paga en Meta — de ahi la decision de posicionamiento,
que a su vez exigio que el multi-cultivo fuera real en el codigo, no
solo en el nombre.

## Pendiente / siguiente paso
Del informe original de auditoria, quedan sin tocar (P1/P2, no
bloquean subida pero valen la pena):
- `plants.tsx` perdio la virtualizacion de lista (paso de `FlatList` a
  `.map()` + `ScrollView`) en un fix anterior — revertir a lista
  virtualizada (`FlashList`) antes de que la base de plantas crezca.
- Token de auth principal en AsyncStorage sin encriptar (el de
  biometria si usa SecureStore).
- Condicion de carrera en el calculo de racha (`src/lib/xp.ts`).
- Cero `accessibilityLabel` en los 5 tabs principales (77 botones
  icon-only sin etiqueta).
- Falta feature graphic (1024x500) y capturas de pantalla para Play
  Store — es diseño, no codigo.
- 2 tests rotos por un problema de Vitest/Rollup parseando sintaxis
  Flow de React Native (`biometric.test.ts`, `stores.test.ts`) — no es
  bug de la app, bloquea confianza de CI en esos dos archivos.
- ~15 paquetes de Expo desalineados de las versiones esperadas para
  el SDK 54 instalado -- `expo install --fix` puede arrastrar cambios
  grandes, no se toco sin una ronda de testing aparte.
- CSV de `exportPlantHistory` sigue con headers en español (no es una
  pantalla, quedo fuera del barrido de i18n).
