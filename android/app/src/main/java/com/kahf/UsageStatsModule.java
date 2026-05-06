package com.kahf;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

public class UsageStatsModule extends ReactContextBaseJavaModule {

    static final String MODULE_NAME = "UsageStats";

    public UsageStatsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    // ─── Permission helpers ───────────────────────────────────────────────────

    @ReactMethod
    public void hasPermission(Promise promise) {
        try {
            AppOpsManager appOps = (AppOpsManager)
                getReactApplicationContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                getReactApplicationContext().getPackageName()
            );
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED);
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void requestPermission(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("PERMISSION_REQUEST_FAILED", e.getMessage());
        }
    }

    // ─── Foreground app query ─────────────────────────────────────────────────

    /**
     * Returns the package name of the current foreground app by querying
     * UsageStatsManager over the last 10 seconds and picking the most recent entry.
     */
    @ReactMethod
    public void getForegroundApp(Promise promise) {
        try {
            UsageStatsManager usm = (UsageStatsManager)
                getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

            long now = System.currentTimeMillis();
            List<UsageStats> stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST, now - 10_000L, now
            );

            if (stats == null || stats.isEmpty()) {
                promise.resolve(null);
                return;
            }

            SortedMap<Long, UsageStats> sorted = new TreeMap<>();
            for (UsageStats us : stats) {
                sorted.put(us.getLastTimeUsed(), us);
            }

            String pkg = sorted.isEmpty()
                ? null
                : sorted.get(sorted.lastKey()).getPackageName();

            promise.resolve(pkg);
        } catch (Exception e) {
            promise.reject("QUERY_FAILED", e.getMessage());
        }
    }

    /**
     * Returns usage time in minutes per package for today (midnight → now).
     */
    @ReactMethod
    public void getDailyUsage(Promise promise) {
        try {
            UsageStatsManager usm = (UsageStatsManager)
                getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);

            java.util.Calendar cal = java.util.Calendar.getInstance();
            cal.set(java.util.Calendar.HOUR_OF_DAY, 0);
            cal.set(java.util.Calendar.MINUTE, 0);
            cal.set(java.util.Calendar.SECOND, 0);
            long startOfDay = cal.getTimeInMillis();
            long now = System.currentTimeMillis();

            List<UsageStats> stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startOfDay, now
            );

            WritableMap result = Arguments.createMap();
            if (stats != null) {
                for (UsageStats us : stats) {
                    if (us.getTotalTimeInForeground() > 0) {
                        result.putDouble(
                            us.getPackageName(),
                            us.getTotalTimeInForeground() / 60_000.0
                        );
                    }
                }
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("DAILY_USAGE_FAILED", e.getMessage());
        }
    }

    // ─── Service control ──────────────────────────────────────────────────────

    @ReactMethod
    public void startMonitoringService(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            Intent intent = new Intent(ctx, MonitoringService.class);
            intent.setAction(MonitoringService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_START_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void stopMonitoringService(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            Intent intent = new Intent(ctx, MonitoringService.class);
            intent.setAction(MonitoringService.ACTION_STOP);
            ctx.startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_STOP_FAILED", e.getMessage());
        }
    }

    // ─── Required for NativeEventEmitter ─────────────────────────────────────

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}
}
