/**
 * SyncService - Legacy placeholder
 *
 * TODO: This service was designed for advanced conflict resolution but is not currently used.
 * Current sync mechanism uses:
 * - useInitSync hook for data hydration on app startup
 * - Direct Supabase calls in components/hooks (sync.ts functions)
 *
 * Future implementation should refactor this to:
 * - Remove hook usage (hooks are for React components only)
 * - Use Zustand store.getState() instead
 * - Implement batch sync for queued operations
 */

export class SyncService {
  async fullSync() {
    throw new Error('SyncService.fullSync not implemented. Use direct sync functions in sync.ts instead.')
  }
}

export const syncService = new SyncService()
