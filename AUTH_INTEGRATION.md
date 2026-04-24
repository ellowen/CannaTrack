# Supabase Auth Integration — CannaTrack

Status: IMPLEMENTED — Week 5 Part 3/3

## Overview

Complete authentication system with:
- Email/password signup and login
- JWT token management (automatic refresh)
- Role-based access (Free/Pro)
- Auth state persistence
- Protected routes
- Mobile and web parity

## Files Created

### Frontend (Vite + React)

- **`/frontend/src/lib/auth.ts`** — Core auth functions (signUp, signIn, signOut, onAuthStateChange)
- **`/frontend/src/contexts/AuthContext.tsx`** — React context + useAuth hook
- **`/frontend/src/pages/Login.tsx`** — Login page with email/password form
- **`/frontend/src/pages/SignUp.tsx`** — Sign up page with password validation
- **`/frontend/src/components/ProtectedRoute.tsx`** — Route guard for authenticated pages
- **`/frontend/src/hooks/useAuthSync.ts`** — Sync auth state to Zustand store
- **`/frontend/.env.example`** — Environment variables template

### Mobile (Expo + React Native)

- **`/mobile/src/lib/auth.ts`** — Identical to frontend auth module
- **`/mobile/app/auth.tsx`** — Updated auth screen (signup + login + biometric)

### Root

- **`AUTH_INTEGRATION.md`** — This file

## Configuration

### Environment Variables

#### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Mobile (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from Supabase dashboard → Settings → API.

### Supabase Setup

1. Enable email authentication:
   - Authentication → Providers → Email
   - Enable "Confirm email" or "Auto-confirm"

2. Row-level security (RLS):
   - All policies already configured in `/backend/supabase/migrations/20260424_01_init_schema.sql`

3. Auth trigger:
   - Automatically creates `profiles` row when user signs up

## Frontend Usage

### App.tsx (Root)
Wrap your app with AuthProvider:

```tsx
import { AuthProvider } from '@/contexts/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

### Protected Routes
```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

// In router config:
{
  path: '/',
  element: (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  ),
  children: [/* ... */]
}
```

### Components
```tsx
import { useAuth } from '@/contexts/AuthContext'

export function MyComponent() {
  const { user, profile, isSignedIn, signOut } = useAuth()

  if (!isSignedIn) return <div>Not signed in</div>

  return (
    <div>
      <h1>{profile?.username}</h1>
      <p>{user?.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  )
}
```

### Sync Auth to Zustand
```tsx
import { useAuthSync } from '@/hooks/useAuthSync'

export default function App() {
  useAuthSync() // Syncs user/profile to userStore

  return <RouterProvider router={router} />
}
```

## Mobile Usage

### auth.tsx (Sign In/Up Screen)
Already integrated with:
- Email/password login
- Email/password signup with name field
- Biometric fallback (restoreSessionWithBiometric)
- Error handling

### Context (Optional)
For Expo, you can also use AuthContext:

```tsx
import { useAuth } from '@/lib/auth'

// Use the functions directly instead of context
const { user, profile } = await signIn({ email, password })
```

## API Reference

### Frontend & Mobile — `/lib/auth.ts`

#### `signUp(data: SignUpData)`
```typescript
interface SignUpData {
  email: string
  password: string
  name: string
}

// Returns: user
const user = await signUp({ email, password, name })
```

#### `signIn(credentials: AuthCredentials)`
```typescript
interface AuthCredentials {
  email: string
  password: string
}

// Returns: { user, profile }
const { user, profile } = await signIn({ email, password })
```

#### `signOut()`
```typescript
await signOut()
```

#### `onAuthStateChange(callback)`
```typescript
const unsubscribe = onAuthStateChange((user) => {
  console.log('Auth state changed:', user)
})

// Clean up
unsubscribe?.()
```

#### `loadProfile(userId: string)`
```typescript
const profile = await loadProfile(user.id)
```

#### `getCurrentSession()`
```typescript
const session = await getCurrentSession()
```

#### `getCurrentUser()`
```typescript
const user = await getCurrentUser()
```

#### `updateUserMetadata(updates)`
```typescript
await updateUserMetadata({ name: 'New Name' })
```

#### `updateProfile(userId, updates)`
```typescript
await updateProfile(user.id, { theme: 'dark' })
```

### Frontend — `useAuth()` Hook

```typescript
const {
  user,              // Supabase auth user | null
  profile,           // Profiles table row | null
  isLoading,         // Initial auth check in progress
  isSignedIn,        // Boolean shortcut
  signUp,            // (data) => Promise<void>
  signIn,            // (credentials) => Promise<void>
  signOut,           // () => Promise<void>
} = useAuth()
```

## Flow Diagrams

### Sign Up Flow
```
User enters email/password/name
          ↓
signUp() → Supabase Auth creates user
          ↓
Trigger → Creates profiles row
          ↓
Email sent (if email confirmation enabled)
          ↓
onAuthStateChange fires (if auto-confirm)
          ↓
User redirected to / (if authenticated)
```

### Sign In Flow
```
User enters email/password
          ↓
signIn() → Supabase Auth validates
          ↓
JWT token stored in localStorage
          ↓
loadProfile() fetches profiles row
          ↓
onAuthStateChange fires
          ↓
User redirected to / (if coming from /login)
```

### Protected Route Flow
```
User navigates to protected page
          ↓
ProtectedRoute checks useAuth()
          ↓
isLoading? → Show spinner
          ↓
isSignedIn? → Show page
          ↓
!isSignedIn → Redirect to /login
```

## Error Handling

All auth functions throw on error:

```typescript
try {
  await signIn({ email, password })
} catch (error) {
  // error is Error instance
  console.error(error.message)
}
```

Common errors:
- `"Invalid login credentials"` → Wrong email/password
- `"Email not confirmed"` → User hasn't confirmed email yet
- `"User already registered"` → Email already exists
- `"Password should be at least 6 characters"` → Weak password

## Database Schema

### profiles table
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  push_token TEXT,
  notification_time TIME DEFAULT '09:00:00',
  is_pro BOOLEAN DEFAULT false,
  streak_days INT DEFAULT 0,
  xp INT DEFAULT 0,
  theme TEXT DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- Created automatically when user signs up (via trigger)
- One row per user
- Synced with `auth.users` table

## Security

- JWT tokens stored in localStorage (frontend) / AsyncStorage (mobile)
- Automatic token refresh handled by Supabase
- Session persists across page/app reloads
- All API requests include auth token (Supabase handles this)
- Row-level security (RLS) enforces user isolation

## Testing

### Manual Sign Up
1. Navigate to `/signup`
2. Enter email, password (8+ chars, strong), name
3. If email confirmation enabled: check email for link
4. Sign in with credentials
5. Redirected to `/`

### Manual Sign In
1. Navigate to `/login`
2. Enter email + password
3. Click "Ingresar →"
4. Redirected to `/` (or previous page)

### Session Persistence
1. Sign in
2. Refresh page (F5)
3. User should still be signed in

### Sign Out
1. Go to Settings
2. Click "Cerrar sesión"
3. Redirected to `/login`
4. Session cleared

### Protected Route
1. Sign out
2. Try to navigate to `/` directly
3. Redirected to `/login` automatically

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
cd frontend
npm install @supabase/supabase-js
```

### "Missing Supabase environment variables"
- Check `frontend/.env` exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server: `npm run dev`

### "Invalid login credentials"
- Verify email is correct
- Check password is correct
- Ensure user account exists in Supabase

### "Email not confirmed"
- If email confirmation is required:
  1. Check your email inbox
  2. Click confirmation link
  3. Try sign in again

### Auth state not syncing to Zustand
- Call `useAuthSync()` once in your App component
- Check userStore for `userId` after sign in

## Next Steps

1. **Email Verification** — Add custom email templates in Supabase
2. **Password Reset** — Implement `/forgot-password` flow
3. **OAuth** — Add Google/GitHub sign-in (google-auth.ts already partially done)
4. **Biometric Mobile** — Enhance biometric auth on mobile
5. **2FA** — Add two-factor authentication for Pro tier
6. **Audit Logs** — Track auth events (login/logout/signup)

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [React Router Protected Routes](https://reactrouter.com/main/start/overview)
- [Zustand Docs](https://github.com/pmndrs/zustand)
