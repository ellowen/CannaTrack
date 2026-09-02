# Auth Quick Start — CannaTrack

## Setup (5 min)

### 1. Frontend Environment
```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 3. Start Dev Server
```bash
npm run dev
# Visit http://localhost:5173/signup
```

## Usage Examples

### Sign Up
```typescript
import { useAuth } from '@/contexts/AuthContext'

export function SignUpForm() {
  const { signUp } = useAuth()
  
  async function handle() {
    try {
      await signUp({
        email: 'user@example.com',
        password: 'SecurePass123',
        name: 'Juan'
      })
      // Redirect happens automatically after confirmation
    } catch (error) {
      alert(error.message)
    }
  }
  
  return <button onClick={handle}>Sign Up</button>
}
```

### Sign In
```typescript
export function LoginForm() {
  const { signIn } = useAuth()
  
  async function handle() {
    try {
      await signIn({
        email: 'user@example.com',
        password: 'SecurePass123'
      })
      // Auth state updates, user sees protected pages
    } catch (error) {
      alert(error.message)
    }
  }
  
  return <button onClick={handle}>Sign In</button>
}
```

### Check Auth Status
```typescript
export function MyComponent() {
  const { user, profile, isSignedIn } = useAuth()
  
  if (!isSignedIn) return <div>Please sign in</div>
  
  return (
    <div>
      <h1>Welcome, {profile?.username}</h1>
      <p>{user?.email}</p>
    </div>
  )
}
```

### Sign Out
```typescript
export function LogoutButton() {
  const { signOut } = useAuth()
  
  return (
    <button onClick={async () => {
      await signOut()
      // Redirected to /login automatically
    }}>
      Cerrar sesión
    </button>
  )
}
```

### Protect Routes
```typescript
// In router/index.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

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

## Environment Variables

```bash
# frontend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get from: Supabase Dashboard → Settings → API → Project URL & Keys

## Key Files

| File | What It Does |
|------|-------------|
| `/frontend/src/lib/auth.ts` | Core auth functions |
| `/frontend/src/contexts/AuthContext.tsx` | React context + useAuth hook |
| `/frontend/src/pages/Login.tsx` | Login page |
| `/frontend/src/pages/SignUp.tsx` | Sign up page |
| `/frontend/src/components/ProtectedRoute.tsx` | Route guard |

## Mobile (Expo)

Same functions, no context needed:

```typescript
import { signIn, signOut } from '@/lib/auth'

const { user, profile } = await signIn({ email, password })
await signOut()
```

Already integrated in `/mobile/app/auth.tsx`

## Common Tasks

### Get Current User
```typescript
const { user } = useAuth()
console.log(user?.id, user?.email)
```

### Get User Profile Data
```typescript
const { profile } = useAuth()
console.log(profile?.username, profile?.is_pro)
```

### Update Profile
```typescript
import { updateProfile } from '@/lib/auth'

await updateProfile(user.id, {
  theme: 'dark',
  notifications_enabled: true
})
```

### Check If Pro
```typescript
const { profile } = useAuth()
const isPro = profile?.is_pro ?? false
```

### Conditional Rendering
```typescript
const { isSignedIn, isLoading } = useAuth()

if (isLoading) return <Spinner />
if (!isSignedIn) return <LoginPrompt />
return <Dashboard />
```

## Troubleshooting

### Can't sign in
- Check email/password are correct
- Verify email is confirmed (if required)
- Check browser console for errors

### Protected route always redirects
- Verify AuthProvider wraps your app
- Check localStorage has token
- Refresh page to reload auth state

### useAuth returns null
- Make sure you're inside AuthProvider
- Check App.tsx has AuthProvider wrapper

### Mobile not working
- Ensure `.env` file exists in `/mobile`
- Run `expo prebuild` if needed
- Restart dev server: `expo start`

## Testing Flow

```
1. Visit http://localhost:5173/signup
2. Enter email, password (8+ chars), name
3. Click "Crear cuenta →"
4. See confirmation message
5. Visit http://localhost:5173/login
6. Enter email + password
7. Redirected to home page
8. Go to Settings → Cerrar sesión
9. Redirected to login
10. Try accessing / directly → redirected to /login
```

## API Endpoints Called

All goes through Supabase client (handles auth header automatically):

- `POST /auth/v1/signup` → signUp()
- `POST /auth/v1/token?grant_type=password` → signIn()
- `POST /auth/v1/logout` → signOut()
- `GET /auth/v1/user` → getCurrentUser()
- `GET /rest/v1/profiles?id=eq.{userId}` → loadProfile()
- `PATCH /rest/v1/profiles` → updateProfile()

## Database Schema

### profiles
```
id              uuid (PK, FK to auth.users)
username        text
push_token      text
notification_time time
is_pro          boolean
streak_days     integer
xp              integer
theme           text
notifications_enabled boolean
created_at      timestamp
updated_at      timestamp
```

Created automatically when user signs up (via trigger).

## Security Notes

- Passwords must be 8+ characters
- JWT stored securely (browser/mobile native storage)
- Automatic token refresh every 1 hour
- All DB access goes through RLS policies
- Row-level security: users can only see their own data

## Next Features

- [x] Email/password auth
- [ ] Password reset flow
- [ ] OAuth (Google/GitHub)
- [ ] Two-factor auth
- [ ] Session management
- [ ] Account recovery

## Documentation

- **Full guide:** `/AUTH_INTEGRATION.md`
- **Implementation details:** `/IMPLEMENTATION_SUMMARY.md`
- **Code:** Read comments in `/frontend/src/lib/auth.ts`

## Support

Check Supabase docs:
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [JS Client Ref](https://supabase.com/docs/reference/javascript)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Everything works out of the box once environment variables are set.**
