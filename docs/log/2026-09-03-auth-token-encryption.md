# 2026-09-03 — Token de auth de mobile encriptado (con precaucion)

## Que se hizo
De la lista de pendientes P1/P2 de la auditoria de stores: el token
principal de sesion de Supabase en mobile se guardaba en AsyncStorage
en texto plano. Antes de tocarlo, se encontro en `git log` que esto
**ya se intento antes y rompio el login**: 25 abr 2026 (`74cff44`) se
movio la sesion entera a SecureStore con chunking manual (SecureStore
tiene limite de 2048 bytes, la sesion de Supabase pesa 3-4KB), y dos
dias despues (`83d4c3f`) se revirtio explicitamente porque el login
dejaba de persistir.

Dado el riesgo real y que no hay forma de probar en dispositivo/
simulador real desde este entorno (solo `expo start --web`, donde
SecureStore ni siquiera corre), se le pregunto al usuario como
proceder. Eligio la opcion recomendada: envelope encryption en vez
de repetir el enfoque que ya fallo.

- `mobile/src/lib/encryptedAuthStorage.ts`: AsyncStorage sigue siendo
  el backend real (el camino ya probado que funciona). SecureStore
  solo guarda una clave AES chica (~44 bytes, fija) UNA vez -- nunca
  el valor de la sesion en si, nunca se chunkea. Clave cacheada en
  memoria tras la primera lectura.
- `expo-crypto` (CSPRNG para generar la clave) + `crypto-js` (AES
  puro JS, sin modulo nativo nuevo mas alla de expo-crypto).
- 8 tests nuevos verificando el round-trip, que el plaintext nunca
  llega a AsyncStorage, IV random, manejo seguro de un valor legacy
  en texto plano (no rompe, fuerza re-login), y que la clave se
  genera una sola vez.
- Commit: `1f3177d`, pusheado.

## Por que
Diferenciar claramente de que se trata: NO es repetir el intento de
abril. La diferencia arquitectural clave es que SecureStore ahora se
toca una sola vez en la vida de la instalacion (generacion de clave),
nunca en el camino caliente de cada login/refresh de token -- que es
exactamente donde la version de abril generaba condiciones de carrera
intermitentes.

## Pendiente / siguiente paso
**No dar esto por cerrado sin probarlo en un dispositivo real.** El
usuario fue advertido explicitamente en el commit: login, cerrar la
app del todo, volver a abrir, confirmar que la sesion sigue activa.
Si algo falla, el primer sospechoso es la interaccion entre
`expo-crypto`/`crypto-js` y el entorno nativo real (Hermes en
dispositivo vs Node en los tests), no la logica de encriptado en si
(esa ya esta verificada con tests).
