import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import {
  useAbcStore,
  hydrateAbcStore,
  logAbc,
} from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface AbcHomeCardProps {
  onPress?: () => void;
}

export function AbcHomeCard({ onPress }: AbcHomeCardProps) {
  const db = useSQLiteContext();
  const { todayCount, lastLoggedAt, yesterdayCount, dailyGoal } = useAbcStore();

  useEffect(() => {
    hydrateAbcStore(db);
  }, []);

  async function handleLog() {
    try {
      await logAbc(db);
    } catch (e) {
      console.error('[AbcHomeCard] Log failed:', e);
      // logAbc throws on DB error — silently ignore in UI since
      // the store was not updated (DB write guards store update)
    }
  }

  const diff = todayCount - yesterdayCount;
  // Only show trend if yesterday had data (avoids misleading "more than yesterday" on day 1)
  const hasTrend = yesterdayCount > 0 || todayCount > 0;
  const trendIcon =
    !hasTrend ? <Minus size={14} color={COLORS.textMuted} /> :
    diff > 0 ? <TrendingUp size={14} color={COLORS.calories} /> :
    diff < 0 ? <TrendingDown size={14} color={COLORS.success} /> :
    <Minus size={14} color={COLORS.textMuted} />;
  const trendText =
    !hasTrend ? 'No data yet' :
    diff === 0 ? 'Same as yesterday' :
    `${Math.abs(diff)} ${diff > 0 ? 'more' : 'less'} than yesterday`;
  const trendColor = !hasTrend ? COLORS.textMuted : diff > 0 ? COLORS.calories : diff < 0 ? COLORS.success : COLORS.textMuted;

  const lastLoggedStr = lastLoggedAt
    ? new Date(lastLoggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Not logged yet';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ABC</Text>
            <Text style={styles.goal}>Limit: {dailyGoal}/day</Text>
          </View>
          <Text style={styles.count}>{todayCount}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <StatRow label="Last Logged" value={lastLoggedStr} />
          <View style={styles.trendRow}>
            <Text style={styles.statLabel}>Trend</Text>
            <View style={styles.trendValue}>
              {trendIcon}
              <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
            </View>
          </View>
        </View>

        {/* Add button */}
        <TouchableOpacity style={styles.addBtn} onPress={handleLog} activeOpacity={0.7}>
          <Plus size={20} color={COLORS.abc} />
          <Text style={styles.addBtnText}>Add ABC</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  goal: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  count: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.abc,
  },
  stats: { gap: SPACING.xs },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.abc,
    backgroundColor: `${COLORS.abc}15`,
  },
  addBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.abc,
  },
});
