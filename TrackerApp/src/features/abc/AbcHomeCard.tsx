import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
  undoLastAbc,
} from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface AbcHomeCardProps {
  onPress?: () => void;
}

export function AbcHomeCard({ onPress }: AbcHomeCardProps) {
  const db = useSQLiteContext();
  const { todayCount, lastLoggedAt, yesterdayCount, undoEntry, undoStack, dailyGoal } = useAbcStore();

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastVisible = useRef(false);
  const [toastMounted, setToastMounted] = React.useState(false);

  useEffect(() => {
    hydrateAbcStore(db);
  }, []);

  // Animate toast in/out when undoEntry changes
  useEffect(() => {
    if (undoEntry && !toastVisible.current) {
      toastVisible.current = true;
      setToastMounted(true);
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (!undoEntry && toastVisible.current) {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        toastVisible.current = false;
        setToastMounted(false);
      });
    }
  }, [undoEntry]);

  async function handleLog() {
    try {
      await logAbc(db);
    } catch (e) {
      // silent fail — UI already updated optimistically
    }
  }

  async function handleUndo() {
    try {
      await undoLastAbc(db);
    } catch (e) {
      // silent fail
    }
  }

  const diff = todayCount - yesterdayCount;
  const trendIcon =
    diff > 0 ? <TrendingUp size={14} color={COLORS.calories} /> :
    diff < 0 ? <TrendingDown size={14} color={COLORS.success} /> :
    <Minus size={14} color={COLORS.textMuted} />;
  const trendText = diff === 0 ? 'Same as yesterday' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'less'} than yesterday`;
  const trendColor = diff > 0 ? COLORS.calories : diff < 0 ? COLORS.success : COLORS.textMuted;

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

        {/* Undo toast — only mounted when there's something to undo */}
        {toastMounted && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={undoEntry ? 'auto' : 'none'}
          >
            <Text style={styles.toastText}>
              {undoStack.length > 1 ? `${undoStack.length} logged` : 'ABC Logged'}
            </Text>
            <TouchableOpacity onPress={handleUndo} hitSlop={8}>
              <Text style={styles.toastUndo}>Undo</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.glassHighlight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  toastText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
  },
  toastUndo: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.abc,
  },
});
