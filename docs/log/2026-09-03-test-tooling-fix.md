# 2026-09-03 — Los 2 tests rotos de mobile: no era tooling, eran bugs reales tapados

## Que se hizo
Ultimo item de la lista de la auditoria de stores de esta sesion:
`biometric.test.ts` y `stores.test.ts` fallaban con un error de
Rollup/esbuild al parsear `node_modules/react-native/index.js` (usa
sintaxis Flow, `import typeof`, que el transform de Vitest no
entiende). Cualquier test cuya cadena de imports llegara al paquete
real de `react-native` (directo o transitivo via `@/lib/storage` o
`@/lib/biometric`) fallaba asi.

Fix de raiz: mockear `react-native` globalmente en
`src/__tests__/setup.ts`, ahora conectado a `vitest.config.ts` (el
archivo ya existia con utilidades compartidas pero nunca estuvo
wireado a `setupFiles` -- quedaba muerto).

Sacar el error de parseo destapo dos bugs reales, previamente
invisibles:

1. **stores.test.ts** llamaba a los hooks de Zustand como funciones
   sueltas (`useUserStore()`) en vez de `.getState()` -- explota
   fuera de un render de React real. Corregido. De paso, el test de
   `nutritionStore` asumia que `tables` arrancaba con datos, pero el
   store esta diseñado a proposito para arrancar vacio (lazy-load) --
   se separo en dos tests que reflejan el comportamiento real.

2. **biometric.test.ts** automockeaba `expo-local-authentication`/
   `expo-secure-store` sin factory -- Vitest igual carga el modulo
   real para inferir la forma, y explotaba por un global de runtime
   nativo inexistente en Node. Cambiado a mocks explicitos. Eso
   destapo un bug en el propio helper de test: el contador de
   intentos fallidos de biometria solo subia en una excepcion tirada,
   pero el mock realista resuelve `{success: false}` sin tirar nada
   -- nunca sumaba. Corregido, mas el umbral de bloqueo (estaba en 6,
   correspondia a 5, igual que `BIOMETRIC_MAX_ATTEMPTS` en el codigo
   real).

Commit: `ab20dae`, pusheado.

## Por que
Ninguno de los dos era en realidad "un problema de tooling" como
sugeria el sintoma -- era codigo de test roto (bugs reales, no
cosmeticos) que quedo invisible durante meses detras de un error de
parseo que fallaba primero. Vale la pena recordarlo: cuando un test
falla por un error de infraestructura, arreglar la infraestructura
puede destapar fallos reales debajo, no asumir que "ya esta" apenas
deja de tirar el error original.

## Pendiente / siguiente paso
Con esto se cierran TODOS los items de la auditoria de stores de esta
sesion, salvo dos que quedan fuera del alcance de lo que puedo hacer
desde aca:
- Assets de Play Store (feature graphic 1024x500 + capturas) --
  trabajo de diseño.
- Verificar en un dispositivo real que la encriptacion del token de
  auth (commit `1f3177d`) no rompe la persistencia del login -- no
  hay simulador/dispositivo en este entorno.
