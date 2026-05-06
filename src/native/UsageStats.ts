import {NativeEventEmitter, NativeModules} from 'react-native';

const {UsageStats} = NativeModules as {UsageStats: NativeUsageStatsModule};

// ─── Types ─────────────────────────────────────────────────────────────────

interface NativeUsageStatsModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  getForegroundApp(): Promise<string | null>;
  getDailyUsage(): Promise<Record<string, number>>;
  startMonitoringService(): Promise<boolean>;
  stopMonitoringService(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface AppChangeEvent {
  /** Android package name of the newly-foregrounded app */
  packageName: string;
  /** True when packageName is in the monitored target list */
  isTargetApp: boolean;
  /** Unix timestamp (ms) of when the change was detected */
  timestamp: number;
}

// ─── Public API ────────────────────────────────────────────────────────────

export const UsageStatsModule = {
  /** Returns true if the user has granted Usage Access permission */
  hasPermission: (): Promise<boolean> => UsageStats.hasPermission(),

  /** Opens Settings › Apps › Special app access › Usage access */
  requestPermission: (): Promise<boolean> => UsageStats.requestPermission(),

  /** One-shot query of the current foreground app package name */
  getForegroundApp: (): Promise<string | null> => UsageStats.getForegroundApp(),

  /**
   * Returns a map of { packageName → minutesInForeground } for today.
   * Only includes packages with > 0 ms of usage.
   */
  getDailyUsage: (): Promise<Record<string, number>> =>
    UsageStats.getDailyUsage(),

  /** Start the persistent foreground monitoring service */
  startMonitoringService: (): Promise<boolean> =>
    UsageStats.startMonitoringService(),

  /** Stop the foreground monitoring service */
  stopMonitoringService: (): Promise<boolean> =>
    UsageStats.stopMonitoringService(),
};

/**
 * Native event emitter wired to UsageStatsModule.
 * Listen for "onAppChange" events to react to foreground app changes.
 *
 * @example
 * const sub = UsageStatsEmitter.addListener('onAppChange', event => { ... });
 * return () => sub.remove();
 */
export const UsageStatsEmitter = new NativeEventEmitter(UsageStats);
