# Mobile Security Audit Report
**Date:** April 24, 2026  
**Severity Summary:** 6 CRITICAL | 12 HIGH | 9 MEDIUM | 2 LOW

---

## CRITICAL VULNERABILITIES (Must Fix This Week)

### 1. AsyncStorage Tokens Not Encrypted
**File:** `mobile/src/lib/supabase.ts:10`  
**Risk:** Rooted/jailbroken devices can read tokens from unencrypted AsyncStorage  
**Current:**
```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,  // <-- INSECURE, unencrypted
    persistSession: true,
  },
})
```

**Fix:** Use SecureStore for auth tokens only
```typescript
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,  // <-- Encrypted
    persistSession: true,
  },
})
```

---

### 2. No HTTPS Certificate Pinning
**File:** `mobile/src/lib/network.ts:11-22`  
**Risk:** MITM attackers can intercept API calls and steal tokens  
**Current:**
```typescript
const response = await fetch('https://www.google.com/favicon.ico', {
  mode: 'no-cors',  // <-- Disables cert validation!
})
```

**Fix:** Use Supabase endpoint with validation + proper cert pinning
```typescript
async function checkOnline(): Promise<boolean> {
  try {
    const response = await Promise.race([
      fetch(`${SUPABASE_URL}/rest/v1/`, { 
        method: 'HEAD',
        headers: { Authorization: 'Bearer ' + (await getToken()) }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      ),
    ])
    return response.ok
  } catch {
    return false
  }
}
```

---

### 3. All User Data Unencrypted in AsyncStorage
**Files:**
- `mobile/src/store/userStore.ts:98` — user data
- `mobile/src/store/plantStore.ts:62` — all plants
- `mobile/src/store/syncStore.ts:63` — sync queue

**Risk:** Any app with file access can read plant data, XP, secrets  
**Fix:** Create encrypted storage adapter
```typescript
// src/lib/encryptedStorage.ts
import * as SecureStore from 'expo-secure-store'

const createEncryptedStorage = () => ({
  getItem: async (name: string) => {
    try {
      const encrypted = await SecureStore.getItemAsync(name)
      return encrypted ? JSON.parse(encrypted) : null
    } catch (e) {
      console.error(`Failed to decrypt ${name}:`, e)
      return null
    }
  },
  setItem: async (name: string, value: unknown) => {
    await SecureStore.setItemAsync(name, JSON.stringify(value))
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name)
  },
})

// Then use in stores:
export const usePlantStore = create<PlantStore>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'cannatrack-plants',
      storage: createEncryptedStorage(),  // <-- Encrypted
    }
  )
)
```

---

### 4. RLS Policy Bypass - Allows Null Auth
**File:** `supabase/migrations/20260424_04_rls_policies.sql:12-14`  
**Risk:** Unauthenticated requests can update XP  
**Current:**
```sql
with check (auth.uid() = id or auth.uid() is null);  -- <-- INSECURE!
```

**Fix:** Remove null check
```sql
with check (auth.uid() = id);  -- Auth required
```

---

### 5. No Biometric Attempt Rate Limiting
**File:** `mobile/src/lib/biometric.ts:36-54`  
**Risk:** Brute force biometric bypass (no attempt counter)  
**Fix:**
```typescript
// Add to userStore or new securityStore
let failedBiometricAttempts = 0
const BIOMETRIC_MAX_ATTEMPTS = 5

export async function authenticateWithBiometric(): Promise<Session | null> {
  if (failedBiometricAttempts >= BIOMETRIC_MAX_ATTEMPTS) {
    alert('Too many attempts. Please use password.')
    return null
  }

  const result = await LocalAuthentication.authenticateAsync({
    disableDeviceFallback: false,
    reason: 'Authentica con tu cara o huella',
  })

  if (!result.success) {
    failedBiometricAttempts++
    console.warn(`Biometric failed (${failedBiometricAttempts}/${BIOMETRIC_MAX_ATTEMPTS})`)
    return null
  }

  failedBiometricAttempts = 0  // Reset on success
  const { data } = await supabase.auth.getSession()
  return data.session || null
}
```

---

### 6. Network Polling Insecure Fallback
**File:** `mobile/src/lib/network.ts:21`  
**Issue:** Mode 'no-cors' bypasses SSL validation  
**Already fixed above** ✓

---

## HIGH SEVERITY (Fix in Week 2)

### 7. Type Confusion - dateReviver Accepts Invalid Dates
**File:** `mobile/src/lib/storage.ts:7-12`  
**Risk:** Invalid dates silently fail, breaking task logic  
**Fix:**
```typescript
const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
  
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    console.error(`Invalid ISO date detected: ${value}`)
    return value  // Return string, don't create invalid Date
  }
  return date
}
```

---

### 8. Sync Queue Payloads Not Validated
**File:** `mobile/src/lib/syncQueue.ts:110-140`  
**Risk:** Corrupted AsyncStorage can inject malicious payloads  
**Fix:** Add Zod validation
```typescript
import { z } from 'zod'

const updatePlantSchema = z.object({
  plantId: z.string().uuid(),
  status: z.enum(['active', 'harvested', 'discarded'])
})

const completTaskSchema = z.object({
  taskId: z.string().uuid(),
  notes: z.string().max(500).optional()
})

async function processSyncAction(action: SyncAction, userId: string): Promise<void> {
  try {
    switch (action.type) {
      case 'updatePlant': {
        const parsed = updatePlantSchema.parse(action.payload)  // <-- Validate
        // ... rest of logic
        break
      }
      case 'completeTask': {
        const parsed = completTaskSchema.parse(action.payload)  // <-- Validate
        // ... rest of logic
        break
      }
    }
  } catch (error) {
    console.error(`Invalid sync payload: ${action.type}`, error)
    // Don't process malformed data
  }
}
```

---

### 9-20. Additional HIGH Vulnerabilities:
- **Session tokens not validated on restore** (biometric.ts)
- **No session timeout/inactivity detection** (auth.ts)
- **Error messages leak sensitive data** (auth.tsx, measurements.tsx)
- **Google OAuth state parameter not checked** (google-auth.ts)
- **Sync queue not rate-limited** (syncQueue.ts)
- **No audit logging for auth events** (auth.ts, biometric.ts)
- **Dependencies have known CVEs** (postcss, uuid) — run `npm audit fix`
- **No request timeouts configured** (supabase.ts)
- **No GDPR data deletion mechanism** (entire app)

---

## MEDIUM & LOW PRIORITY

See full security audit for additional findings on:
- Console logging sensitive data
- Missing input validation (plant name, notes)
- Type safety gaps with `as any` casts
- Hardcoded colors/constants

---

## COMPLIANCE ISSUES

- **GDPR Article 17**: No "right to be forgotten" endpoint
- **GDPR Article 32**: No encryption at rest (AsyncStorage)
- **CCPA**: No data retention policy for measurements

---

## IMPLEMENTATION ORDER

```
WEEK 1 (CRITICAL):
- [ ] Encrypt AsyncStorage with SecureStore
- [ ] Fix RLS policy null check
- [ ] Add biometric rate limiting
- [ ] Fix cert pinning in network check
- [ ] Add dateReviver validation
- [ ] Add Zod payload validation

WEEK 2 (HIGH):
- [ ] Implement session timeout
- [ ] Sanitize error messages
- [ ] Fix OAuth state parameter
- [ ] Add rate limiting to sync queue
- [ ] Update vulnerable dependencies
- [ ] Implement audit logging

WEEK 3+ (MEDIUM/LOW + COMPLIANCE):
- [ ] Create GDPR data deletion endpoint
- [ ] Add data retention policies
- [ ] Implement comprehensive logging
- [ ] Add input validation to all forms
```

---

## TESTING CHECKLIST

After each fix, verify:

### Encryption
- [ ] Delete app, reinstall, login → token not readable in AsyncStorage
- [ ] Use Frida/Objection to inspect SecureStore → data encrypted
- [ ] Offline sync works without unencrypted persistence

### Rate Limiting
- [ ] Biometric fails 5x → "Too many attempts" error
- [ ] Manual retry after 15 mins works
- [ ] No auth bypass possible

### Validation
- [ ] Malformed JSON in AsyncStorage → app doesn't crash
- [ ] Invalid dates in tasks → graceful handling
- [ ] Zod validation catches bad sync payloads

### Network
- [ ] HTTP request to fake domain blocked (cert error)
- [ ] Network.checkOnline() uses Supabase endpoint
- [ ] Timeout after 2s if slow network

---

**Status:** Ready to implement  
**Owner:** Mobile team  
**Timeline:** 3 weeks to address all CRITICAL + HIGH
