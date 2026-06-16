import React, { useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, SPACING } from '../theme/colors';

export interface AppItem {
  packageName: string;
  displayName: string;
  minutesToday: number;
  tier: 'soft' | 'friction' | 'hard' | null;
}

interface AppListProps {
  apps: AppItem[];
}

export function AppList({ apps }: AppListProps) {
  const [hoveredPackage, setHoveredPackage] = useState<string | null>(null);

  const renderAppRow = ({ item }: { item: AppItem }) => (
    <AppListRow
      app={item}
      isHovered={hoveredPackage === item.packageName}
      onHoverStart={() => setHoveredPackage(item.packageName)}
      onHoverEnd={() => setHoveredPackage(null)}
    />
  );

  return (
    <FlatList
      data={apps}
      renderItem={renderAppRow}
      keyExtractor={item => item.packageName}
      scrollEnabled={true}
      nestedScrollEnabled={true}
    />
  );
}

interface AppListRowProps {
  app: AppItem;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function AppListRow({
  app,
  isHovered,
  onHoverStart,
  onHoverEnd,
}: AppListRowProps) {
  const tierBgColor: Record<string, string> = {
    soft: COLORS.tierSoft,
    friction: COLORS.tierFriction,
    hard: COLORS.tierHard,
    null: COLORS.tierNone,
  };

  return (
    <Pressable
      onPressIn={onHoverStart}
      onPressOut={onHoverEnd}
      style={[
        styles.row,
        isHovered && styles.rowHovered,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.appName}>{app.displayName}</Text>
        <Text style={styles.packageName}>{app.packageName}</Text>
      </View>

      {/* Timer Display with expanded state on hover/press */}
      <View
        style={[
          styles.timerContainer,
          { backgroundColor: tierBgColor[app.tier || 'null'] },
          isHovered && styles.timerContainerExpanded,
        ]}
      >
        <Text style={styles.timerText}>{app.minutesToday} min</Text>
        {isHovered && app.tier && (
          <Text style={styles.tierLabel}>{app.tier.toUpperCase()}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  rowHovered: {
    backgroundColor: '#FAF9F6', // Subtle highlight on press
  },
  content: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  packageName: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timerContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  timerContainerExpanded: {
    minWidth: 90,
    paddingVertical: SPACING.md,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
});