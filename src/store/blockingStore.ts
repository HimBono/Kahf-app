import {create} from 'zustand';
import {BlockingTier, BLOCKING_TIERS, TIER_THRESHOLDS} from '../constants/targetApps';

// ─── State shape ───────────────────────────────────────────────────────────

interface BlockingState {
  // ── Runtime ──────────────────────────────────────────────────────────────
  /** Package name currently in the foreground, null if not a target app */
  currentTargetApp: string | null;
  /** Whether the monitoring service is running */
  isMonitoring: boolean;
  /** Active blocking tier, null when no target app is in foreground */
  activeTier: BlockingTier | null;
  /** Continuous minutes spent in the current target-app session */
  sessionMinutes: number;

  // ── Daily stats ───────────────────────────────────────────────────────────
  /** Total minutes across all target apps today */
  todayTotalMinutes: number;
  /** Per-package minutes today, e.g. { 'com.instagram.android': 23 } */
  todayPerApp: Record<string, number>;

  // ── Actions ───────────────────────────────────────────────────────────────
  setCurrentTargetApp: (app: string | null) => void;
  setMonitoring: (active: boolean) => void;
  /** Called every minute by AppMonitor while a target app is in focus */
  tickSession: () => void;
  /** Called when user switches away from a target app */
  resetSession: () => void;
  setTodayUsage: (perApp: Record<string, number>) => void;
}

// ─── Tier resolver ─────────────────────────────────────────────────────────

function resolveTier(sessionMinutes: number): BlockingTier | null {
  if (sessionMinutes >= TIER_THRESHOLDS[BLOCKING_TIERS.HARD]) {
    return BLOCKING_TIERS.HARD;
  }
  if (sessionMinutes >= TIER_THRESHOLDS[BLOCKING_TIERS.FRICTION]) {
    return BLOCKING_TIERS.FRICTION;
  }
  if (sessionMinutes >= TIER_THRESHOLDS[BLOCKING_TIERS.SOFT]) {
    return BLOCKING_TIERS.SOFT;
  }
  return null;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useBlockingStore = create<BlockingState>(set => ({
  currentTargetApp: null,
  isMonitoring: false,
  activeTier: null,
  sessionMinutes: 0,
  todayTotalMinutes: 0,
  todayPerApp: {},

  setCurrentTargetApp: app =>
    set({
      currentTargetApp: app,
      // Reset session timer when a new app takes focus (or focus is lost)
      sessionMinutes: 0,
      activeTier: null,
    }),

  setMonitoring: active => set({isMonitoring: active}),

  tickSession: () =>
    set(state => {
      const sessionMinutes = state.sessionMinutes + 1;
      return {
        sessionMinutes,
        activeTier: resolveTier(sessionMinutes),
      };
    }),

  resetSession: () =>
    set({
      currentTargetApp: null,
      sessionMinutes: 0,
      activeTier: null,
    }),

  setTodayUsage: perApp => {
    const todayTotalMinutes = Object.values(perApp).reduce((a, b) => a + b, 0);
    set({todayPerApp: perApp, todayTotalMinutes});
  },
}));
