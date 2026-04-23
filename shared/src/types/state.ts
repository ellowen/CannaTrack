/* ============================================================================
 * STATE SLICES — Interfaces para Zustand slices (sin implementación)
 * ============================================================================ */

import type {
  User,
  Plant,
  ScheduledTask,
  NutritionTable,
  GameState,
  Streak,
  AccessTier,
  PlantStatus,
} from "./domain";

/* --- USER SLICE --- */

export interface UserSlice {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User) => void;
  clearUser: () => void;
  updateUserAccessTier: (tier: AccessTier) => void;
  updateGameState: (gameState: GameState) => void;
  updateStreakState: (streak: Streak) => void;
}

/* --- PLANT SLICE --- */

export interface PlantSlice {
  plants: Plant[];
  selectedPlantId: string | null;
  isLoading: boolean;
  error: string | null;

  addPlant: (plant: Plant) => void;
  removePlant: (plantId: string) => void;
  updatePlant: (plantId: string, updates: Partial<Plant>) => void;
  selectPlant: (plantId: string | null) => void;
  setPlants: (plants: Plant[]) => void;
  changePlantStatus: (plantId: string, status: PlantStatus) => void;
}

/* --- TASK SLICE --- */

export interface TaskSlice {
  tasks: ScheduledTask[];
  isLoading: boolean;
  error: string | null;

  addTask: (task: ScheduledTask) => void;
  removeTask: (taskId: string) => void;
  completeTask: (taskId: string, notes?: string) => void;
  updateTask: (taskId: string, updates: Partial<ScheduledTask>) => void;
  setTasks: (tasks: ScheduledTask[]) => void;
  getTasksForDate: (date: Date) => ScheduledTask[];
  getTasksForPlant: (plantId: string) => ScheduledTask[];
}

/* --- NUTRITION SLICE --- */

export interface NutritionSlice {
  tables: NutritionTable[];
  selectedTableId: string | null;
  isLoading: boolean;
  error: string | null;

  setTables: (tables: NutritionTable[]) => void;
  addTable: (table: NutritionTable) => void;
  selectTable: (tableId: string | null) => void;
  getTableById: (tableId: string) => NutritionTable | undefined;
}

/* --- SYNC SLICE (Supabase) --- */

export interface SyncSlice {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  isOnline: boolean;

  setSyncing: (syncing: boolean) => void;
  setLastSync: (date: Date) => void;
  setSyncError: (error: string | null) => void;
  setOnline: (online: boolean) => void;
  syncAllData: () => Promise<void>;
}

/* --- COMBINED ROOT STATE --- */

export interface RootState
  extends UserSlice,
    PlantSlice,
    TaskSlice,
    NutritionSlice,
    SyncSlice {}
