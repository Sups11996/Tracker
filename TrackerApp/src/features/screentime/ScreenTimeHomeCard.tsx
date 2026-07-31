import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Smartphone, Lock } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  useScreenTimeStore,
  checkScreenTimePermission,
  requestScreenTimePermission,
  fetchScreenTimeStats,
  formatScreenTime,
} from '../../stores/screenTimeStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface ScreenTimeHomeCardProps {
  onPress?: () => void;
}

export function ScreenTimeHomeCard({ onPress }: ScreenTimeHomeCardProps) {
  const {
    hasPermission,
    totalScreenTimeMs,
    unlockCount,
    mostUsedApp,
  } = useScreenTimeStore();

  useEffect(() => {
    if (Platform.OS === 'android') {
      loadData();
    }
  }, []);

  async function loadData() {
    const permission = await checkScreenTimePermission();
    if (permission) {
      await fetchScreenTimeStats();
    }
  }

  async function handleRequestPermission() {
    await requestScreenTimePermission();
    // User will return from settings, re-check on next mount or manual refresh
  }

  if (Platform.OS !== 'android') {
    return (
      <Card style={styles.card}>
        <Text style={styles.unavailableText}>
          Screen Time tracking is only available on Android
        </Text>
      </Card>
    );
  }

  if (!hasPermission) {
    return (
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Smartphone size={18} color={COLORS.screenTime} />
            <Text style={styles.title}>Screen Time</Text>
          </View>
        </View>

        <View style={styles.permissionPrompt}>
          <Smartphone size={48} color={COLORS.textMuted} />
          <Text style={styles.promptTitle}>Permission Required</Text>
          <Text style={styles.promptDesc}>
            Grant Usage Access to track your screen time and app usage
          </Text>
          <Button
            label="Grant Permission"
            onPress={handleRequestPermission}
            variant="primary"
            accentColor={COLORS.screenTime}
            style={styles.permissionBtn}
          />
        </View>
      </Card>
    );
  }

  const totalTime = formatScreenTime(totalScreenTimeMs);
  const mostUsedTime = mostUsedApp ? formatScreenTime(mostUsedApp.totalTimeMs) : '—';
  const percentage = totalScreenTimeMs > 0 && mostUsedApp
    ? Math.round((mostUsedApp.totalTimeMs / totalScreenTimeMs) * 100)
    : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Smartphone size={18} color={COLORS.screenTime} />
            <Text style={styles.title}>Screen Time</Text>
          </View>
          <Text style={styles.total}>{totalTime}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <StatRow
            icon={<Smartphone size={16} color={COLORS.screenTime} />}
            label="Most Used"
            value={mostUsedApp?.appName ?? 'N/A'}
            sub={`${mostUsedTime} · ${percentage}%`}
          />
          <StatRow
            icon={<Lock size={16} color={COLORS.textMuted} />}
            label="Unlocks"
            value={`${unlockCount}`}
            sub="times today"
          />
        </View>

        {/* Refresh hint */}
        <Text style={styles.hint}>Tap to view detailed breakdown</Text>
      </Card>
    </TouchableOpacity>
  );
}

function StatRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>{icon}</View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  total: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.screenTime,
  },
  stats: { gap: SPACING.sm },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: { flex: 1, gap: 2 },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  statSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  hint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  permissionPrompt: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  promptTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  promptDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  permissionBtn: {
    marginTop: SPACING.sm,
  },
  unavailableText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
