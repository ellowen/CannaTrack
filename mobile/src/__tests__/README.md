# CannaTrack Mobile Test Suite

Comprehensive unit and integration tests for critical mobile workflows.

## Running Tests

```bash
npm test                 # Run all tests
npm test:ui            # Run tests with Vitest UI
npm test:coverage      # Run tests with coverage report
```

## Test Files Overview

### 1. `syncQueue.test.ts`
Tests the offline → online sync cycle and sync queue management.

**Coverage:**
- Offline queueing of actions when no connection
- Processing sync queue when online with valid auth
- Updating sync state (isSyncing, lastSyncAt, syncError)
- Error handling and partial failure recovery
- Empty queue edge cases

**Key scenarios:**
- User makes changes offline → changes queued
- User comes online → sync processes automatically
- Sync state reflects current status at all times
- If sync fails, error is captured and displayed
- Individual action failures don't stop other syncs

**Critical paths tested:** >80% coverage of `src/lib/syncQueue.ts` and sync store

---

### 2. `biometric.test.ts`
Tests biometric authentication with rate limiting and session security.

**Coverage:**
- Rate limiting: blocks after 6 failed attempts
- Session storage in secure encrypted storage
- Biometric availability detection
- Biometric type detection (Face ID vs Fingerprint)
- Session restoration with biometric

**Key scenarios:**
- User fails auth 5 times → still allowed
- User fails auth 6th time → blocked with "too many attempts" error
- On success, failed attempts reset to 0
- Session tokens stored securely (not in plain AsyncStorage)
- Can restore session using saved biometric tokens

**Critical paths tested:** >80% coverage of `src/lib/biometric.ts`

---

### 3. `encryptedStorage.test.ts`
Tests AsyncStorage encryption and sensitive data protection.

**Coverage:**
- Encryption of sensitive data (API tokens, sessions, credentials)
- Decryption returns original plaintext
- Encrypted data is not readable as plain text in storage
- Different encryption keys produce different ciphertexts
- Support for special characters, unicode, large objects
- Session lifecycle (clear, overwrite, bulk clear)

**Key scenarios:**
- Store API token → encrypted in storage
- Retrieve token → decrypted correctly
- Try to read encrypted storage directly → unreadable gibberish
- Store biometric session → cannot be recovered without key
- Store large plant data → encrypted efficiently without data loss

**Critical paths tested:** >80% coverage of sensitive data paths in `src/lib/storage.ts`

---

### 4. `networkPolling.test.ts`
Tests network polling respects app state (foreground/background).

**Coverage:**
- Polling stops when app backgrounded
- Polling resumes when app comes back to active
- No API requests made while backgrounded (resource optimization)
- Custom poll intervals respected
- Multiple rapid state transitions handled correctly

**Key scenarios:**
- App starts polling network every 5 seconds while active
- User backgrounds app → polling stops immediately
- User opens app again → polling resumes
- No wasted battery/data while backgrounded
- Rapid foreground/background cycles don't cause duplicate polls

**Critical paths tested:** >80% coverage of `src/lib/network.ts` and app state integration

---

### 5. `syncBatching.test.ts`
Tests sync queue batching to reduce API calls.

**Coverage:**
- Multiple updates to same plant batched into 1 API call
- Updates to different plants sent in separate batches
- Payload merging handles conflicting and non-conflicting fields
- Latest value wins in conflicts
- Queue properly cleaned after successful sync
- All data preserved in batched request

**Key scenarios:**
- Queue 5 plant updates to plantId "plant-1" → only 1 API call made
- Final state is correct merge of all 5 updates
- Queue 5 updates to "plant-1" + 5 to "plant-2" → 2 API calls (one per plant)
- If one update payload is {height: 20} then {height: 25}, final value is 25
- After sync completes, all processed actions removed from queue

**Critical paths tested:** >80% coverage of batching logic in `src/lib/syncQueue.ts`

---

## Test Coverage Goals

All tests aim for **>80% coverage** of critical paths:

- Offline sync cycle and error recovery
- Authentication workflows
- Sensitive data handling
- Network state management
- Sync optimization

## Mocking Strategy

Tests mock external dependencies:
- `supabase` client (auth, database)
- `AsyncStorage` (device storage)
- `expo-local-authentication` (biometric APIs)
- `expo-secure-store` (encrypted storage)
- `AppState` (foreground/background state)

This allows testing without actual device/network calls.

## Adding New Tests

When adding tests for new features:

1. Create a new file in `src/__tests__/` named `featureName.test.ts`
2. Mock all external dependencies
3. Test both success and failure paths
4. Include edge cases (empty inputs, rapid calls, state transitions)
5. Aim for descriptive test names that read like scenarios
6. Group tests with `describe()` blocks by functionality

Example structure:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  describe('Scenario category', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

## Running Specific Tests

```bash
npm test syncQueue              # Run only syncQueue tests
npm test -- --grep "batching"   # Run tests matching pattern
npm test -- --reporter=verbose  # Verbose output
```

## CI Integration

Add to your CI/CD pipeline:

```bash
npm test -- --coverage --reporter=verbose
```

This generates coverage reports for monitoring test health.
