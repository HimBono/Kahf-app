package com.kahf;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Foreground service that polls UsageStatsManager every POLL_INTERVAL_MS and
 * emits an "onAppChange" event to the React Native JS bridge whenever the
 * foreground app changes. Runs persistently (START_STICKY) so Android
 * restarts it after being killed.
 */
public class MonitoringService extends Service {

    public static final String ACTION_START = "com.kahf.START_MONITORING";
    public static final String ACTION_STOP  = "com.kahf.STOP_MONITORING";

    private static final String CHANNEL_ID      = "kahf_monitoring_channel";
    private static final int    NOTIFICATION_ID  = 1001;
    private static final long   POLL_INTERVAL_MS = 2_000L;

    // Packages to monitor — include both TikTok distribution IDs
    private static final Set<String> TARGET_PACKAGES = new HashSet<>(Arrays.asList(
        "com.zhiliaoapp.musically",  // TikTok (global)
        "com.ss.android.ugc.trill",  // TikTok (some markets)
        "com.instagram.android",      // Instagram (Reels)
        "com.google.android.youtube", // YouTube (Shorts)
        "com.snapchat.android"        // Snapchat (Spotlight)
    ));

    private Handler  handler;
    private Runnable pollRunnable;
    private String   lastPackage = "";

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        startPolling();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ─── Polling ──────────────────────────────────────────────────────────────

    private void startPolling() {
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                checkForegroundApp();
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };
        handler.post(pollRunnable);
    }

    private void checkForegroundApp() {
        UsageStatsManager usm = (UsageStatsManager)
            getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return;

        long now = System.currentTimeMillis();
        List<UsageStats> stats = usm.queryUsageStats(
            UsageStatsManager.INTERVAL_BEST, now - 5_000L, now
        );
        if (stats == null || stats.isEmpty()) return;

        SortedMap<Long, UsageStats> sorted = new TreeMap<>();
        for (UsageStats us : stats) {
            sorted.put(us.getLastTimeUsed(), us);
        }
        if (sorted.isEmpty()) return;

        String current = sorted.get(sorted.lastKey()).getPackageName();

        // Only emit when the foreground app actually changes
        if (current.equals(lastPackage)) return;
        lastPackage = current;

        boolean isTarget = TARGET_PACKAGES.contains(current);
        emitAppChange(current, isTarget);
    }

    // ─── JS bridge event ──────────────────────────────────────────────────────

    private void emitAppChange(String packageName, boolean isTargetApp) {
        try {
            ReactInstanceManager rim =
                ((ReactApplication) getApplication())
                    .getReactNativeHost()
                    .getReactInstanceManager();

            ReactContext reactContext = rim.getCurrentReactContext();
            if (reactContext == null || !reactContext.hasActiveCatalystInstance()) return;

            WritableMap payload = Arguments.createMap();
            payload.putString("packageName", packageName);
            payload.putBoolean("isTargetApp", isTargetApp);
            payload.putDouble("timestamp", (double) System.currentTimeMillis());

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onAppChange", payload);

        } catch (Exception ignored) {
            // React context may be temporarily unavailable during JS reload
        }
    }

    // ─── Notification ─────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Kahf Protection",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Kahf is protecting your focus");
            channel.setShowBadge(false);
            channel.enableVibration(false);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_IMMUTABLE
            : 0;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openApp, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Kahf is active")
            .setContentText("Your focus is being protected")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build();
    }
}
