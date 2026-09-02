# CannaTrack - Plan de Migracion Mobile
**Version:** 1.0 | **Fecha:** Abril 2026 | **Estado:** En revision

---

## INDICE

1. [Resumen Ejecutivo (CEO)](#1-resumen-ejecutivo)
2. [Estado Actual - Paridad Funcional (PM)](#2-paridad-funcional)
3. [Arquitectura Propuesta (Tech Lead)](#3-arquitectura)
4. [Stack Tecnologico (Tech Lead)](#4-stack)
5. [Estrategia de Reutilizacion de Codigo (Frontend Engineer)](#5-reutilizacion)
6. [Plan de Migracion Step by Step (Tech Lead + Frontend)](#6-plan-migracion)
7. [Mejoras UX/UI Mobile (UX Designer)](#7-ux-ui)
8. [Flujo de Autenticacion Completo (Backend Engineer)](#8-autenticacion)
9. [Riesgos y Mitigaciones (QA + Tech Lead)](#9-riesgos)
10. [Estimacion de Tiempos (PM)](#10-tiempos)
11. [Roadmap Detallado (PM + CEO)](#11-roadmap)
12. [Quick Wins - Esta Semana (Frontend Engineer)](#12-quick-wins)

---

## 1. RESUMEN EJECUTIVO (CEO)

### Situacion
CannaTrack ya tiene una app mobile funcional en Expo/React Native. El problema no es
empezar de cero - es completar y pulir lo que ya existe para llegar a un MVP shippeable.

### Lo que ya funciona
- Auth con Supabase (email/password) + guard de navegacion
- Onboarding
- Tabs: Home (tareas del dia), Calendario, Perfil
- Alta de plantas con genetica/tabla nutricional
- Detalle de planta
- Diario con fotos
- Edicion de planta
- Mediciones

### Lo que falta para MVP mobile
- Gamificacion (XP, niveles, logros) - existe en frontend, falta portar
- Tabla nutricional custom - existe en frontend, falta portar
- Google OAuth + autenticacion biometrica
- Push notifications nativas
- Diagnostico IA por foto (post-MVP)
- UI polish con sistema de diseno consistente

### Oportunidad
El motor nutricional (`generatePlantSchedule`, `startFloraPhase`) ya es portable.
Los tipos TypeScript son compartibles. La logica de negocio esta lista.
El trabajo restante es mayormente UI y autenticacion.

---

## 2. PARIDAD FUNCIONAL (Product Manager)

### Checklist Web vs Mobile

| Feature | Web (frontend) | Mobile (actual) | Prioridad |
|---------|---------------|-----------------|-----------|
| Auth email/password | SI | SI | - |
| Auth Google OAuth | NO | NO | ALTA |
| Auth biometrica | NO | NO | ALTA |
| Onboarding | SI | SI | - |
| Home con tareas del dia | SI | SI | - |
| Calendario mensual | SI | SI | - |
| Nueva planta (formulario) | SI | SI | - |
| Detalle de planta | SI | SI | - |
| Editar planta | SI | SI | - |
| Iniciar floracion | SI | Pendiente UI | ALTA |
| Calendario nutricional por semana | SI | Pendiente UI | ALTA |
| Diario con fotos | SI | SI | - |
| Mediciones (EC, pH, altura) | SI | SI | - |
| Week logs | SI | Pendiente UI | MEDIA |
| Tabla nutricional custom | SI | NO | MEDIA |
| Gamificacion (XP, niveles) | SI | NO | MEDIA |
| Logros / badges | SI | NO | BAJA |
| Diagnostico IA por foto | NO | NO | BAJA |
| Push notifications | NO | NO | ALTA |
| Exportar historial PDF | NO | NO | BAJA |
| Plan Free vs Pro (feature flags) | NO | NO | MEDIA |

### Gaps criticos para MVP
1. **Iniciar floracion** - boton en PlantDetail mobile que llama `startFloraPhase()`
2. **Vista calendario nutricional** - mostrar semana actual con dosis por producto
3. **Google OAuth** - sin esto la conversion de registro es baja
4. **Push notifications** - core value del producto (recordatorios de riego)
5. **Gamificacion** - diferenciador clave de retencion

---

## 3. ARQUITECTURA PROPUESTA (Tech Lead)

### Arquitectura actual (problema)

```
mobile/
  app/          <- pantallas con logica de negocio mezclada
  lib/          <- supabase client
  (sin hooks)   <- queries Supabase directo en componentes
```

### Arquitectura objetivo

```
mobile/
  app/          <- solo routing y composicion de pantallas
  components/   <- componentes reutilizables (atoms, molecules)
  hooks/        <- useAuth, usePlants, useTasks, useGamification
  lib/          <- supabase, notifications, storage
  store/        <- zustand (cache local + sync)
  
frontend/src/
  lib/          <- nutrition-engine, gamification, haptics (compartido)
  types/        <- tipos TypeScript (compartido via @shared alias)
```

### Patron de datos en mobile

```
Componente
    |
    v
Hook (useXxx)         <- abstrae Supabase
    |
    +--> Zustand store  <- cache en memoria + optimistic updates
    |
    +--> Supabase       <- fuente de verdad remota
```

Esto permite:
- Offline-first: store sirve datos aunque no haya internet
- Optimistic UI: actualizar store antes de confirmar con Supabase
- Sync transparente: hooks manejan errores y retry

### Compartir codigo entre web y mobile

```
CannaTrack/
  shared/           <- NUEVO: codigo 100% portable
    lib/
      nutrition-engine.ts   <- mover desde frontend/src/lib/
      nutrition-utils.ts
      gamification.ts
    types/
      plant.ts
      measurement.ts
      weekLog.ts
  frontend/src/
    lib/ -> importa desde @shared/lib/
  mobile/
    lib/ -> importa desde @shared/lib/
```

Alias en babel.config.js (ya configurado): `@shared` -> `../frontend/src`

---

## 4. STACK TECNOLOGICO (Tech Lead)

### Stack actual (mantener)

| Capa | Tecnologia | Version | Estado |
|------|-----------|---------|--------|
| Framework | Expo | ~54.0.0 | OK |
| Runtime | React Native | 0.81.5 | OK |
| React | React | 19.1.0 | OK |
| Router | Expo Router | ~5.0.0 | OK |
| Backend | Supabase | ^2.47.0 | OK |
| Storage local | AsyncStorage | 2.2.0 | OK |
| Estado global | Zustand | ^5.0.0 | OK |
| Fechas | date-fns | ^3.6.0 | OK |
| Fotos | expo-image-picker | ~16.1.0 | OK |

### Agregar para completar MVP

| Paquete | Para que | Instalacion |
|---------|---------|-------------|
| `expo-local-authentication` | Face ID / Touch ID | `npx expo install expo-local-authentication` |
| `expo-notifications` | Push notifications | `npx expo install expo-notifications` |
| `expo-secure-store` | Guardar tokens biometria | `npx expo install expo-secure-store` |
| `@react-native-google-signin/google-signin` | Google OAuth | `npx expo install @react-native-google-signin/google-signin` |
| `expo-device` | Detectar dispositivo fisico | `npx expo install expo-device` |

### NO agregar (decision explicita)

- NativeWind/TailwindCSS - incompatible con Expo Go new arch, usar StyleSheet
- Redux - Zustand es suficiente
- React Query - Zustand + Supabase real-time es suficiente para MVP
- react-native-firebase - Supabase cubre todo lo necesario

### Sistema de estilos sin NativeWind

Usar un archivo `mobile/constants/theme.ts` con tokens de diseno:

```typescript
export const colors = {
  bg: {
    primary: '#0C1410',
    surface: '#131D14',
    elevated: '#1A2B1D',
  },
  border: {
    default: '#1C2E1E',
    focus: '#52CC64',
  },
  text: {
    primary: '#E4F2E7',
    secondary: '#728C74',
    muted: '#3A5040',
  },
  brand: {
    green: '#52CC64',
    greenDark: '#3DA64E',
  },
  status: {
    warning: '#F5A623',
    error: '#E53E3E',
    info: '#4299E1',
  },
}

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
}

export const radius = {
  sm: 8, md: 16, lg: 24, full: 999,
}

export const typography = {
  h1: { fontSize: 32, fontWeight: '900' as const },
  h2: { fontSize: 24, fontWeight: '800' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
}
```

---

## 5. ESTRATEGIA DE REUTILIZACION DE CODIGO (Frontend Engineer)

### Lo que SE puede reutilizar hoy (via @shared alias)

| Archivo | Reutilizable | Razon |
|---------|-------------|-------|
| `frontend/src/lib/nutrition-engine.ts` | 100% | Logica pura, sin dependencias de React/browser |
| `frontend/src/lib/nutrition-utils.ts` | 100% | Idem |
| `frontend/src/lib/gamification.ts` | 100% | Idem |
| `frontend/src/types/plant.ts` | 100% | TypeScript puro |
| `frontend/src/types/measurement.ts` | 100% | TypeScript puro |
| `frontend/src/types/weekLog.ts` | 100% | TypeScript puro |
| `frontend/src/data/revegetar-table.ts` | 100% | Datos puros |

### Lo que NO se puede reutilizar directamente

| Archivo | Problema | Solucion mobile |
|---------|---------|-----------------|
| `frontend/src/store/*.ts` | Usa localStorage persistence | Reimplementar con AsyncStorage |
| `frontend/src/components/*.tsx` | CSS/Tailwind classes | Reimplementar con StyleSheet |
| `frontend/src/pages/*.tsx` | React DOM elements | Reimplementar con RN components |
| `frontend/src/hooks/*.ts` | window/document deps | Revisar caso a caso |

### Imports en mobile (ya funciona con babel alias)

```typescript
// En cualquier pantalla mobile
import { generatePlantSchedule, startFloraPhase } from '@shared/lib/nutrition-engine'
import { getTasksForDate, getCurrentWeek } from '@shared/lib/nutrition-utils'
import { calculatePlantHealth, getLevelInfo } from '@shared/lib/gamification'
import type { Plant, ScheduledTask, NutritionTable } from '@shared/types/plant'
```

---

## 6. PLAN DE MIGRACION STEP BY STEP (Tech Lead + Frontend Engineer)

### FASE 0 - Fundaciones (2-3 dias)

**Objetivo:** Infraestructura solida antes de agregar features.

#### Paso 1: Crear sistema de temas
- Crear `mobile/constants/theme.ts` con colores, spacing, tipografia (ver seccion 4)
- Crear `mobile/constants/index.ts` que re-exporta theme

#### Paso 2: Crear componentes base
Crear `mobile/components/ui/`:
- `Button.tsx` - variantes: primary, secondary, ghost, danger
- `Card.tsx` - surface con borde y padding
- `Badge.tsx` - etiqueta de estado (Vege, Flora, colors)
- `Avatar.tsx` - foto de planta con placeholder
- `EmptyState.tsx` - pantalla vacia con icono y CTA
- `LoadingSpinner.tsx` - ActivityIndicator con tema

#### Paso 3: Crear hooks de datos
Crear `mobile/hooks/`:
- `useAuth.ts` - session, signIn, signUp, signOut
- `usePlants.ts` - plants[], createPlant, updatePlant, deletePlant
- `useTasks.ts` - tasks[], completeTask, getTasksForDate
- `useMeasurements.ts` - measurements[], addMeasurement
- `useWeekLogs.ts` - weekLogs[], addWeekLog

```typescript
// Patron de hook (ejemplo useAuth)
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  return { session, loading, signOut: () => supabase.auth.signOut() }
}
```

#### Paso 4: Fix Supabase trigger
Correr en Supabase SQL Editor:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$;
```

---

### FASE 1 - Completar paridad funcional critica (1 semana)

**Objetivo:** Todas las features ALTA prioridad del checklist funcionando.

#### Paso 5: Iniciar floracion en PlantDetail

En `mobile/app/plants/[id].tsx`, agregar boton que llama `startFloraPhase()`:

```typescript
import { startFloraPhase } from '@shared/lib/nutrition-engine'

async function handleStartFlora() {
  const updatedPlant = startFloraPhase(plant, new Date())
  const { error } = await supabase
    .from('plants')
    .update({
      cycle_phase: updatedPlant.cyclePhase,
      flora_start_date: updatedPlant.floraStartDate?.toISOString(),
      scheduled_tasks: updatedPlant.scheduledTasks,
    })
    .eq('id', plant.id)
  if (!error) mutatePlant(updatedPlant)
}
```

#### Paso 6: Vista calendario nutricional

En `mobile/app/plants/[id].tsx`, agregar seccion de semana actual:

```typescript
import { getCurrentWeek, getTasksForDate } from '@shared/lib/nutrition-utils'

// Mostrar la semana actual con sus productos y dosis
const currentWeek = getCurrentWeek(plant)
const todayTasks = getTasksForDate(plant.scheduledTasks, new Date())
```

#### Paso 7: Push notifications setup

```typescript
// mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null
  
  const { status: existing } = await Notifications.getPermissionsAsync()
  const status = existing === 'granted'
    ? existing
    : (await Notifications.requestPermissionsAsync()).status
    
  if (status !== 'granted') return null
  
  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}

export async function scheduleTaskReminder(task: ScheduledTask) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CannaTrack - Tarea pendiente',
      body: `${task.productName}: ${task.minDose}-${task.maxDose} ml/L`,
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: task.scheduledDate,
    },
  })
}
```

---

### FASE 2 - Autenticacion completa (3-4 dias)

Ver seccion 8 para detalle completo.

---

### FASE 3 - Gamificacion (2-3 dias)

#### Paso 8: Portar gamificacion al mobile

El modulo `@shared/lib/gamification.ts` ya existe y es portable.
Solo hay que crear la UI en mobile:

Crear `mobile/components/gamification/`:
- `XPBar.tsx` - barra de progreso de experiencia
- `LevelBadge.tsx` - badge del nivel actual (Semilla, Brote, etc.)
- `StreakCounter.tsx` - racha de dias consecutivos
- `AchievementCard.tsx` - logro desbloqueado

En `mobile/app/(tabs)/profile.tsx`:
```typescript
import { getLevelInfo, calculatePlantHealth } from '@shared/lib/gamification'

const { level, xp, nextLevelXp, title } = getLevelInfo(profile.total_xp)
```

---

### FASE 4 - Tabla nutricional custom (2 dias)

Portar `frontend/src/pages/CustomTable.tsx` a mobile.
La logica de validacion y guardado ya existe en frontend.

---

### FASE 5 - Polish y preparacion para launch (1 semana)

- Agregar assets: icon.png, splash.png, adaptive-icon.png
- Probar en device fisico iOS y Android
- Configurar EAS Build para generar APK/IPA
- Configurar EAS Submit para App Store / Play Store
- Configurar OTA updates con EAS Update

---

## 7. MEJORAS UX/UI MOBILE (UX Designer)

### Principios de diseno mobile-first

Mobile no es web chica. Estas son las diferencias clave para CannaTrack:

#### 7.1 Navegacion

**Actual:** Tabs con texto + icono simple
**Propuesta:** Bottom tabs con haptic feedback + indicador de badge

```typescript
// (tabs)/_layout.tsx - agregar haptics en tab press
import * as Haptics from 'expo-haptics'

<Tabs.Screen
  name="index"
  options={{
    tabBarIcon: ({ focused }) => (
      <TabIcon name="home" focused={focused} />
    ),
    tabBarButton: (props) => (
      <TouchableOpacity
        {...props}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          props.onPress?.()
        }}
      />
    ),
  }}
/>
```

#### 7.2 Pantalla Home

**Actual:** Lista de tareas plana
**Propuesta:**
- Header con saludo ("Buenos dias, [nombre]" o "Buenas noches")
- Seccion "Hoy" con contador de tareas pendientes
- Cards de plantas activas con estado visual (color por fase)
- Boton FAB (+) para agregar planta rapido
- Pull-to-refresh nativo

#### 7.3 PlantDetail

**Actual:** Pantalla con info basica
**Propuesta:**
- Hero image de la planta (ultima foto del diario)
- Chips de estado: fase actual, semana actual, dias hasta cosecha
- Timeline horizontal de fases (Vege -> Flora -> Cosecha)
- Seccion "Esta semana" con productos y dosis
- Boton primario contextual: "Iniciar floracion" / "Registrar dia" / "Ver historial"
- Indicador de salud de planta (usando calculatePlantHealth)

#### 7.4 Calendario

**Actual:** Vista calendario basica
**Propuesta:**
- Dot indicators en dias con tareas
- Swipe para cambiar mes (gesture nativo)
- Lista de tareas del dia seleccionado debajo del calendario
- Color coding por tipo de tarea (riego=azul, nutricion=verde, observacion=amarillo)

#### 7.5 Micro-interacciones clave

- Marcar tarea como completada: swipe right + haptic medio + animacion check
- Eliminar planta: swipe left + haptic fuerte + confirmacion
- Agregar medicion: teclado numerico con unidades pre-seleccionadas
- Foto diario: camara directa sin picker (mas rapido)
- XP ganado: animacion de +XP flotando (como un juego)

#### 7.6 Flujo de onboarding mejorado

**Actual:** 3 slides informativos
**Propuesta:** Onboarding interactivo:
1. "Como se llama tu planta?" - input directo
2. "Que genetica?" - selector visual (Feminizada / Auto / Regular)
3. "Cuando la plantaste?" - date picker
4. "Que tabla nutricional?" - REVEGETAR (gratis) o subir la tuya
5. -> Genera el calendario automaticamente -> "Tu primer calendario esta listo!"

Esto convierte el onboarding en creacion de primera planta. Reduce la friccion enormemente.

---

## 8. FLUJO DE AUTENTICACION COMPLETO (Backend Engineer)

### 8.1 Estado actual

- Email/password funcionando
- Supabase handle_new_user trigger (requiere fix con set search_path = public)

### 8.2 Google OAuth

#### Setup Supabase
1. En Supabase Dashboard: Authentication > Providers > Google > Enable
2. Agregar Client ID y Client Secret de Google Cloud Console
3. URL de redireccion: `https://wpvvfroutebiwckrenmq.supabase.co/auth/v1/callback`

#### Setup Google Cloud Console
1. Crear proyecto o usar existente
2. APIs y servicios > Credenciales > Crear credenciales > ID de cliente OAuth 2.0
3. Tipo: Aplicacion web (para el redirect de Supabase)
4. Tipo: Android / iOS (para el SDK nativo de la app)
5. Para Android: necesitas el SHA-1 del keystore
6. Para iOS: necesitas el Bundle ID de la app

#### Implementacion mobile

```typescript
// mobile/lib/auth.ts
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'

GoogleSignin.configure({
  webClientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'TU_IOS_CLIENT_ID.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
})

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices()
  const userInfo = await GoogleSignin.signIn()
  
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: userInfo.data?.idToken ?? '',
  })
  
  if (error) throw error
  return data
}
```

```typescript
// En auth.tsx - agregar boton Google
<TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleButton}>
  <GoogleIcon />
  <Text style={styles.googleText}>Continuar con Google</Text>
</TouchableOpacity>
```

### 8.3 Autenticacion biometrica (Face ID / Touch ID)

La biometria NO reemplaza la password - la complementa.
Patron correcto: login inicial con email/password -> guardar session -> login posterior con biometria.

```typescript
// mobile/lib/biometric.ts
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'cannatrack_session'

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync()
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  return compatible && enrolled
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Accede a CannaTrack',
    cancelLabel: 'Usar contrasena',
    fallbackLabel: 'Usar contrasena',
    disableDeviceFallback: false,
  })
  return result.success
}

export async function saveSessionForBiometric(session: Session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }))
}

export async function restoreSessionWithBiometric(): Promise<Session | null> {
  const available = await isBiometricAvailable()
  if (!available) return null
  
  const stored = await SecureStore.getItemAsync(SESSION_KEY)
  if (!stored) return null
  
  const authenticated = await authenticateWithBiometric()
  if (!authenticated) return null
  
  const { access_token, refresh_token } = JSON.parse(stored)
  const { data } = await supabase.auth.setSession({ access_token, refresh_token })
  return data.session
}
```

### 8.4 Flujo completo de auth en _layout.tsx

```typescript
// _layout.tsx actualizado
useEffect(() => {
  async function initAuth() {
    // 1. Intentar restaurar session con biometria
    const biometricSession = await restoreSessionWithBiometric()
    if (biometricSession) {
      setSession(biometricSession)
      return
    }
    
    // 2. Intentar session existente de Supabase
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
  }
  
  initAuth()
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
    setSession(s)
    // Guardar para biometria cuando se loguea
    if (event === 'SIGNED_IN' && s) {
      await saveSessionForBiometric(s)
    }
    if (event === 'SIGNED_OUT') {
      await SecureStore.deleteItemAsync('cannatrack_session')
    }
  })
  
  return () => subscription.unsubscribe()
}, [])
```

### 8.5 Schema Supabase para OAuth

```sql
-- La tabla profiles ya debe manejar usuarios OAuth (sin password)
-- Verificar que handle_new_user funcione para OAuth tambien

-- Agregar columna para token de push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE;
```

---

## 9. RIESGOS Y MITIGACIONES (QA + Tech Lead)

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|-----------|
| Expo Go incompatibilidad con native modules | ALTA | ALTA | Usar Expo Dev Client para Google Auth y biometria |
| Windows path bug en Metro (ya detectado) | ALTA | ALTA | Parche en loadConfig.js documentado |
| Supabase trigger falla al crear usuario | ALTA | ALTA | Fix con set search_path = public (ver Fase 0) |
| react-native-screens version mismatch | MEDIA | ALTA | Pins exactos en overrides del package.json |
| Google OAuth: SHA-1 key management | MEDIA | MEDIA | Documentar keystores en password manager |
| Push notifications no llegan en background | MEDIA | MEDIA | Configurar EAS Push correctamente |
| AsyncStorage size limits (6MB) | BAJA | MEDIA | No cachear fotos, solo IDs y metadata |
| App Store rechazo por cannabis | MEDIA | ALTA | Guidelines 4.2.3: uso legal, no venta, educativo |

### Riesgo App Store - Detalle

Apple y Google permiten apps de cultivo personal siempre que:
- No faciliten venta o distribucion
- Incluyan disclaimer de uso legal
- No muestren contenido que promueva uso ilegal

Accion: agregar en onboarding: "CannaTrack es para uso personal en jurisdicciones donde el cultivo es legal. Verificá la legislacion de tu pais/provincia."

### Testing strategy

```
Unit tests (Vitest - compartidos web/mobile):
  - nutrition-engine.ts: generar schedule, fases, semanas
  - gamification.ts: calculos de XP y niveles
  - nutrition-utils.ts: getTasksForDate, getCurrentWeek

Integration tests (Expo):
  - Auth flow: register -> login -> biometric
  - Plant creation: form -> Supabase -> schedule generado
  - Task completion: swipe -> XP ganado -> streak actualizado

E2E (Detox - post-MVP):
  - Happy path completo: onboarding -> planta -> primer dia
```

---

## 10. ESTIMACION DE TIEMPOS (Product Manager)

Asumiendo 1 desarrollador dedicado (vos), trabajo en bloques de 2-4 horas/dia.

| Fase | Descripcion | Dias estimados | Dias acumulados |
|------|-------------|---------------|-----------------|
| Fase 0 | Fundaciones (theme, componentes base, hooks, fix trigger) | 3 | 3 |
| Fase 1 | Paridad critica (iniciar flora, calendario nutricional, push notifications) | 5 | 8 |
| Fase 2 | Autenticacion completa (Google + biometria) | 4 | 12 |
| Fase 3 | Gamificacion (XP, niveles, logros) | 3 | 15 |
| Fase 4 | Tabla nutricional custom | 2 | 17 |
| Fase 5 | Polish + assets + EAS Build | 5 | 22 |

**Total estimado: ~22 dias habiles (~4-5 semanas)**

### Milestones

- **Dia 8:** App funcional con todas las features core. Apta para beta testers.
- **Dia 15:** App con autenticacion completa y gamificacion. Lista para soft launch.
- **Dia 22:** App polida con EAS Build. Lista para App Store / Play Store submission.

---

## 11. ROADMAP DETALLADO (PM + CEO)

### Sprint 1 (Semana 1-2): "Foundation & Core"
**Meta:** App usable por primeros beta testers

- [ ] Fix Supabase trigger
- [ ] Sistema de temas (theme.ts)
- [ ] Componentes base (Button, Card, Badge)
- [ ] Hooks de datos (usePlants, useTasks)
- [ ] Iniciar floracion en PlantDetail
- [ ] Vista semana nutricional en PlantDetail
- [ ] Push notifications setup

**Entregable:** TestFlight/Play Store beta interno

### Sprint 2 (Semana 3): "Auth & Retention"
**Meta:** Conversion y retencion mejorada

- [ ] Google OAuth
- [ ] Autenticacion biometrica
- [ ] Onboarding interactivo (crear primera planta)
- [ ] Gamificacion: XP bar y niveles en Profile
- [ ] Logros basicos

**Entregable:** Beta publica con link de descarga

### Sprint 3 (Semana 4): "Polish & Launch"
**Meta:** App Store submission

- [ ] Assets (icon, splash)
- [ ] Tabla nutricional custom
- [ ] Animaciones y micro-interacciones
- [ ] Disclaimer legal en onboarding
- [ ] EAS Build configurado
- [ ] Submission a App Store + Play Store

**Entregable:** App en stores (revision ~7 dias para App Store)

### Post-launch (Mes 2+)
- Diagnostico IA por foto (Claude API Vision)
- Plan Free vs Pro con feature flags
- Marketplace de tablas B2B
- Analytics y metricas de retencion
- White label para marcas

---

## 12. QUICK WINS - ESTA SEMANA (Frontend Engineer)

Estas son las tareas que se pueden hacer hoy/manana con mayor impacto:

### Quick Win 1: Fix Supabase trigger (30 min)
Correr el SQL del Paso 4 en Supabase SQL Editor.
Impacto: registro de usuarios funciona correctamente.

### Quick Win 2: Sistema de temas (2 horas)
Crear `mobile/constants/theme.ts` con todos los tokens.
Reemplazar colores hardcodeados en auth.tsx y _layout.tsx.
Impacto: base para todos los estilos futuros.

### Quick Win 3: Boton "Iniciar floracion" (2 horas)
Agregar el boton en `mobile/app/plants/[id].tsx`.
Importar `startFloraPhase` desde `@shared/lib/nutrition-engine`.
Impacto: feature critica que falta en mobile.

### Quick Win 4: Agregar assets (1 hora)
Crear o conseguir:
- `mobile/assets/icon.png` (1024x1024)
- `mobile/assets/splash.png` (1284x2778)
- `mobile/assets/adaptive-icon.png` (1024x1024)
Impacto: elimina warnings y prepara para EAS Build.

### Quick Win 5: Hook useAuth (1 hora)
Extraer logica de auth de `_layout.tsx` a `mobile/hooks/useAuth.ts`.
Impacto: desacoplar la logica de auth del layout, reutilizable en cualquier pantalla.

---

## APENDICE: COMANDOS UTILES

```bash
# Instalar nuevas dependencias
cd C:\Dev\CannaTrack\mobile
npx expo install expo-local-authentication expo-notifications expo-secure-store expo-device

# Limpiar cache y reiniciar
npx expo start --clear

# Generar build de desarrollo (necesita EAS)
npx eas build --profile development --platform android

# Correr en device fisico
npx expo start --tunnel
```

```sql
-- Fix trigger Supabase (correr en SQL Editor)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;
```

---

*CannaTrack Migration Plan v1.0 - Abril 2026*
*Generado con Claude Code*
