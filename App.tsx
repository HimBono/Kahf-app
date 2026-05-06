/**
 * Kahf — Phase 1 entry point
 *
 * Responsibility: permission gate + monitoring bootstrap.
 * The blocking overlay UI lives in Phase 2.
 */
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppMonitor} from './src/services/AppMonitor';
import {useBlockingStore} from './src/store/blockingStore';
import {UsageStatsModule} from './src/native/UsageStats';

// ─── Types ─────────────────────────────────────────────────────────────────

type StartupState = 'loading' | 'needs_permission' | 'running';

// ─── Root component ────────────────────────────────────────────────────────

export default function App(): React.JSX.Element {
  const [startupState, setStartupState] = useState<StartupState>('loading');
  const {isMonitoring, activeTier, sessionMinutes, todayTotalMinutes} =
    useBlockingStore();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {permissionGranted} = await AppMonitor.start();
      if (!mounted) return;
      setStartupState(permissionGranted ? 'running' : 'needs_permission');
    })();

    return () => {
      mounted = false;
      AppMonitor.stop();
    };
  }, []);

  const handleGrantPermission = async () => {
    setStartupState('loading');
    const granted = await UsageStatsModule.hasPermission();
    if (granted) {
      const result = await AppMonitor.start();
      setStartupState(result.permissionGranted ? 'running' : 'needs_permission');
    } else {
      await UsageStatsModule.requestPermission();
      setStartupState('needs_permission');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {startupState === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Starting Kahf…</Text>
        </View>
      )}

      {startupState === 'needs_permission' && (
        <PermissionGate onGrant={handleGrantPermission} />
      )}

      {startupState === 'running' && (
        <Dashboard
          isMonitoring={isMonitoring}
          activeTier={activeTier}
          sessionMinutes={sessionMinutes}
          todayTotalMinutes={todayTotalMinutes}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Permission gate ───────────────────────────────────────────────────────

function PermissionGate({onGrant}: {onGrant: () => void}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.caveEmoji}>🏛</Text>
      <Text style={styles.headline}>Kahf needs Usage Access</Text>
      <Text style={styles.body}>
        To know which app is in the foreground, Kahf requires the{' '}
        <Text style={styles.bold}>Usage Access</Text> permission.
        {'\n\n'}
        Tap below, find <Text style={styles.bold}>Kahf</Text> in the list, and
        toggle it on.
      </Text>
      <Pressable style={styles.button} onPress={onGrant}>
        <Text style={styles.buttonLabel}>Open Usage Access Settings</Text>
      </Pressable>
    </View>
  );
}

// ─── Dashboard (Phase 1 debug view) ───────────────────────────────────────

interface DashboardProps {
  isMonitoring: boolean;
  activeTier: string | null;
  sessionMinutes: number;
  todayTotalMinutes: number;
}

function Dashboard({
  isMonitoring,
  activeTier,
  sessionMinutes,
  todayTotalMinutes,
}: DashboardProps) {
  const tierColor: Record<string, string> = {
    soft: COLORS.tierSoft,
    friction: COLORS.tierFriction,
    hard: COLORS.tierHard,
  };

  return (
    <View style={styles.dashboard}>
      <Text style={styles.headline}>🏛 Kahf</Text>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {backgroundColor: isMonitoring ? COLORS.primary : COLORS.muted},
          ]}
        />
        <Text style={styles.statusLabel}>
          {isMonitoring ? 'Monitoring active' : 'Monitoring paused'}
        </Text>
      </View>

      <StatCard
        label="Today's short-form total"
        value={`${todayTotalMinutes} min`}
      />
      <StatCard label="Current session" value={`${sessionMinutes} min`} />

      <View
        style={[
          styles.tierBadge,
          {
            backgroundColor: activeTier
              ? tierColor[activeTier]
              : COLORS.tierNone,
          },
        ]}>
        <Text style={styles.tierText}>
          {activeTier ? `Tier: ${activeTier.toUpperCase()}` : 'No active tier'}
        </Text>
      </View>

      <Text style={styles.phaseNote}>
        Phase 1 · Monitoring engine active{'\n'}
        Blocking overlays arrive in Phase 2
      </Text>
    </View>
  );
}

function StatCard({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─── Design tokens ─────────────────────────────────────────────────────────

const COLORS = {
  background: '#F7F4EF',
  primary: '#4A6741',
  muted: '#B0AAA0',
  text: '#2C2C2C',
  textSecondary: '#6B6560',
  tierNone: '#E8E4DE',
  tierSoft: '#FFF3CD',
  tierFriction: '#FFD6A5',
  tierHard: '#FFADAD',
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  caveEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  bold: {
    fontWeight: '600',
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dashboard: {
    flex: 1,
    padding: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tierBadge: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  phaseNote: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
