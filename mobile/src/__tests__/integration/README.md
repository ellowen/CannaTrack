# CannaTrack Mobile Integration Tests

Comprehensive integration tests for critical mobile workflows covering the full plant lifecycle and offline sync cycles.

## Test Scenarios

### 1. Plant Lifecycle Integration (`plantLifecycle.test.ts`)

Tests the complete flow from plant creation to harvest.

**Covered workflows:**
- Create new plant with initial task generation
- Progress through vegetative phase with task tracking
- Transition to flowering phase and calendar updates
- Complete daily tasks and track progress
- Harvest plant and move to history
- Discard plant functionality

**Key assertions:**
- New plants have correct initial properties
- Tasks are generated based on nutrition tables
- Task completion updates progress counters
- Plant status transitions work correctly
- Discarded plants have tasks cleared

**Run specific test:**
```bash
npm test plantLifecycle
```

---

### 2. Offline Sync Cycle (`offlineSync.test.ts`)

Tests the offline-first architecture and sync queue management.

**Covered workflows:**
- Queue plant creation while offline
- Queue task completion while offline
- Batch multiple operations offline
- Handle sync state transitions
- Track and recover from sync errors
- Process sync queue when coming online
- Maintain data consistency

**Key assertions:**
- Actions are queued when offline
- Local state updates immediately
- Queue batches actions for same plant
- Sync errors are tracked
- Queue persists on sync failure
- lastSyncAt timestamp updates
- Concurrent operations handled correctly

**Run specific test:**
```bash
npm test offlineSync
```

---

### 3. Multi-Plant Workflow (`multiPlant.test.ts`)

Tests management of multiple plants with different genetics.

**Covered workflows:**
- Create plants with feminized, autoflower, and regular genetics
- Generate appropriate tasks for each genetic type
- Filter and display tasks for specific plants
- Complete tasks independently per plant
- Switch between plant selections
- View combined calendar for all plants

**Key assertions:**
- Different genetics create appropriate task schedules
- Tasks don't mix between plants
- Plant selection switches independently
- Resetting tasks for one plant doesn't affect others
- Calendar shows all tasks from all plants
- Active plants count is accurate

**Run specific test:**
```bash
npm test multiPlant
```

---

### 4. Navigation & State Persistence (`navigation.test.ts`)

Tests app navigation and state management.

**Covered workflows:**
- Navigate between all tabs (home, calendar, settings, history)
- Open plant details and return
- Switch between plants
- Use deep links to specific plants
- Forward/back navigation
- Preserve state across navigation

**Key assertions:**
- Selected plant persists during tab switching
- Plant data retained when navigating away and back
- Deep links correctly navigate to target plant
- Back navigation returns to previous state
- Invalid deep links handled gracefully
- Filter state preserved across navigation

**Run specific test:**
```bash
npm test navigation
```

---

### 5. Photo Handling (`photoHandling.test.ts`)

Tests photo upload, storage, and gallery management.

**Covered workflows:**
- Attach photos to plants
- Display photos in gallery view
- Organize photos by week/stage
- Persist photos after app restart
- Handle large photo collections
- Compare photos across time
- Recover from upload failures

**Key assertions:**
- Photo metadata stored correctly
- Photos appear in chronological order
- Photos grouped by week/stage
- Large collections handled efficiently
- Photos survive app restart
- Failed uploads can be retried
- Deletion removes photos correctly

**Run specific test:**
```bash
npm test photoHandling
```

---

## Running Tests

### Run all integration tests
```bash
npm test
```

### Run with coverage report
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test plantLifecycle.test.ts
```

### Run with UI dashboard
```bash
npm test:ui
```

### Run tests matching pattern
```bash
npm test -- --grep "offline"
```

### Watch mode for development
```bash
npm test -- --watch
```

### Generate HTML coverage report
```bash
npm test -- --coverage
# Opens in coverage/index.html
```

---

## Test Fixtures

All tests use fixtures from `fixtures.ts`:

- `MOCK_NUTRITION_TABLE` - Standard nutrition table for testing
- `createMockPlant()` - Create generic plant with overrides
- `createFeminizedPlant()` - Feminized plant (manual flora start)
- `createAutoflowerPlant()` - Autoflower plant (auto flora)
- `createRegularPlant()` - Regular plant (can be male/female)
- `createMultiplePlantsFixture()` - Pre-configured 3-plant setup with different genetics

Example usage:
```typescript
import { createFeminizedPlant, createMockTask } from './fixtures'

const plant = createFeminizedPlant({ name: 'My Plant' })
const task = createMockTask(plant.id, { completed: true })
```

---

## Key Testing Patterns

### Arrange-Act-Assert

All tests follow AAA pattern:

```typescript
it('should do something', () => {
  // Arrange - setup state
  const plant = createMockPlant()
  plantStore.addPlant(plant)

  // Act - perform action
  plantStore.selectPlant(plant.id)

  // Assert - verify result
  expect(plantStore.selectedPlantId).toBe(plant.id)
})
```

### Store State Management

Each test gets fresh store state:

```typescript
beforeEach(() => {
  plantStore = usePlantStore.getState()
  plantStore.setPlants([])  // Clear before each test
})
```

### Testing async operations

Use callbacks for simulating async behavior:

```typescript
it('should handle sync', async () => {
  syncStore.enqueueAction({ ... })
  syncStore.setIsSyncing(true)
  // Simulate sync operations
  expect(syncStore.isSyncing).toBe(true)
})
```

---

## Coverage Goals

All integration tests aim for:
- >80% coverage of store state transitions
- >80% coverage of critical business logic
- >90% coverage of lifecycle workflows

Current coverage focus:
- Plant CRUD operations
- Task generation and completion
- Offline sync queue
- State persistence
- Multi-plant scenarios
- Photo handling

---

## Debugging Tests

### Enable verbose output
```bash
npm test -- --reporter=verbose
```

### Run single test
```bash
npm test -- -t "should create a plant"
```

### Inspect test state
Add `console.log()` in test or use debugger:
```typescript
it('debug test', () => {
  const store = usePlantStore.getState()
  console.log('Store state:', store)
})
```

### Run with debugger
```bash
node --inspect-brk ./node_modules/.bin/vitest
```

---

## Common Issues & Solutions

### **Issue: Store state not persisting**
**Solution:** Zustand stores are reset between tests. Use `beforeEach()` to set up fresh state.

```typescript
beforeEach(() => {
  const store = usePlantStore.getState()
  store.setPlants([])  // Clear previous test data
})
```

### **Issue: Task generation fails**
**Solution:** Ensure nutrition table exists in store before generating tasks.

```typescript
const table = nutritionStore.tables.find(t => t.id === 'revegetar')
if (table) {
  const tasks = generatePlantSchedule(plant, table)
}
```

### **Issue: Date comparisons fail**
**Solution:** Use date strings for comparison to avoid timezone issues.

```typescript
const dateStr = task.scheduledDate.toISOString().split('T')[0]
expect(dateStr).toBe('2026-04-24')
```

---

## Best Practices

1. **Use fixtures for consistency**
   ```typescript
   // Good
   const plant = createFeminizedPlant({ name: 'Test' })
   
   // Avoid
   const plant = { id: 'p1', name: 'Test', ... }
   ```

2. **Clear state between tests**
   ```typescript
   beforeEach(() => {
     store.setPlants([])
   })
   ```

3. **Test one behavior per test**
   ```typescript
   // Good
   it('should add plant', () => { ... })
   it('should select plant', () => { ... })
   
   // Avoid
   it('should add and select plant', () => { ... })
   ```

4. **Use descriptive test names**
   ```typescript
   // Good
   it('should move plant to harvested status')
   
   // Avoid
   it('should work')
   ```

5. **Group related tests with describe()**
   ```typescript
   describe('Plant creation', () => {
     it('should create feminized plant', () => { ... })
     it('should generate initial tasks', () => { ... })
   })
   ```

---

## Extending Tests

To add tests for new features:

1. Create new file: `src/__tests__/integration/featureName.test.ts`
2. Import fixtures and stores
3. Set up `beforeEach()` to clear state
4. Write tests following AAA pattern
5. Run: `npm test featureName`
6. Check coverage: `npm test -- --coverage`

Example template:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useMyStore } from '@/store/myStore'
import { createMockPlant } from './fixtures'

describe('My Feature', () => {
  let store: ReturnType<typeof useMyStore.getState>

  beforeEach(() => {
    store = useMyStore.getState()
    store.clear()
  })

  describe('Scenario', () => {
    it('should do something', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

---

## CI/CD Integration

Add to your CI pipeline:

```bash
npm test -- --coverage --reporter=verbose
```

This generates coverage reports and verbose output for monitoring test health.

---

## Related Documentation

- `src/__tests__/README.md` - Unit test documentation
- `CLAUDE.md` - Project architecture and conventions
- `vitest.config.ts` - Test configuration
- `package.json` - Test scripts
