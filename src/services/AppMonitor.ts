import {EmitterSubscription, AppState, AppStateStatus} from 'react-native';
import {AppChangeEvent, UsageStatsEmitter, UsageStatsModule} from '../native/UsageStats';
import {useBlockingStore} from '../store/blockingStore';
import {isTargetApp} from '../constants/targetApps';

/**
 * AppMonitor orchestrates the full monitoring lifecycle:
 *
 *  1. Checks/requests Usage Access permission.
 *  2. Starts the native foreground service (MonitoringService.java).
 *  3. Subscribes to "onAppChange" events from the native bridge.
 *  4. Drives the Zustand store (session timer, tier escalation).
 *  5. Refreshes daily-usage stats when the JS app returns to foreground.
 *
 * Usage:
 *   await AppMonitor.start();   // call once, e.g. in App.tsx useEffect
 *   AppMonitor.stop();          // call on cleanup / sign-out
 */
class AppMonitorService {
  private eventSub: EmitterSubscription | null = null;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: {remove(): void} | null = null;

  // ─── Public API ────────────────────────────────────────────────────────

  async start(): Promise<{permissionGranted: boolean}> {
    const granted = await UsageStatsModule.hasPermission();
    if (!granted) {
      await UsageStatsModule.requestPermission();
      return {permissionGranted: false};
    }

    await UsageStatsModule.startMonitoringService();

    this.eventSub = UsageStatsEmitter.addListener(
      'onAppChange',
      this.handleAppChange,
    );

    // Refresh daily stats whenever the app comes back to foreground
    this.appStateSub = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    useBlockingStore.getState().setMonitoring(true);
    await this.refreshDailyUsage();
    this.startSessionTimer();

    return {permissionGranted: true};
  }

  stop(): void {
    this.eventSub?.remove();
    this.eventSub = null;

    this.appStateSub?.remove();
    this.appStateSub = null;

    this.clearSessionTimer();
    useBlockingStore.getState().setMonitoring(false);
    useBlockingStore.getState().resetSession();

    UsageStatsModule.stopMonitoringService().catch(() => {});
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private handleAppChange = (event: AppChangeEvent): void => {
    const store = useBlockingStore.getState();

    if (!event.isTargetApp) {
      this.clearSessionTimer();
      store.resetSession();
      return;
    }

    // New target app entered foreground
    if (event.packageName !== store.currentTargetApp) {
      this.clearSessionTimer();
      store.setCurrentTargetApp(event.packageName);
      this.startSessionTimer();
    }
  };

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active') {
      this.refreshDailyUsage().catch(() => {});
    }
  };

  private startSessionTimer(): void {
    // Tick immediately at 0 seconds, then every 60 seconds
    useBlockingStore.getState().tickSession();
    this.sessionTimer = setInterval(() => {
      useBlockingStore.getState().tickSession();
    }, 60_000);
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer !== null) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private async refreshDailyUsage(): Promise<void> {
    try {
      const perApp = await UsageStatsModule.getDailyUsage();
      // Only keep target apps in the store to reduce noise
      const filtered = Object.fromEntries(
        Object.entries(perApp).filter(([pkg]) => isTargetApp(pkg)),
      );
      useBlockingStore.getState().setTodayUsage(filtered);
    } catch {
      // Non-fatal — daily stats are best-effort
    }
  }
}

export const AppMonitor = new AppMonitorService();