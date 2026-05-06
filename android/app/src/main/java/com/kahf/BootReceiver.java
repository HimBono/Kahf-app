package com.kahf;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Restarts MonitoringService after device reboot or app update so the user
 * doesn't have to manually re-open Kahf each time.
 *
 * Requires RECEIVE_BOOT_COMPLETED permission in the manifest.
 * The app must have been launched at least once after install for this to fire.
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            Intent serviceIntent = new Intent(context, MonitoringService.class);
            serviceIntent.setAction(MonitoringService.ACTION_START);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
