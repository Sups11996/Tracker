import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Droplets } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import {
  useWaterStore,
  hydrateWaterStore,
  logWater,
  undoLastLog,
} from '../../stores/waterStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface WaterHomeCardProps {
  onPress?: () => void;
}

export function WaterHomeCard({ onPress }: WaterHomeCardProps) {
  const db = useSQLiteContext();
  const { todayTotal, dailyGoal, containers, undoEntry } = useWaterStore();

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastVisible = useRef(false);

  useEffect(() => {
    hydrateWaterStore(db);
  }, []);

  // Animate toast in/out when undoEntry changes
  useEffect(() => {
    if (undoEntry && !toastVisible.current) {
      toastVisible.current = true;
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
      });
    }
  }, [undoEntry]);

  async function handleLog(container: typeof containers[0]) {
    try {
      await logWater(db, container);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUndo() {
    try {
      await undoLastLog(db);
    } catch (e) {
      console.error(e);
    }
  }

  const progress = dailyGoal > 0 ? Math.min(todayTotal / dailyGoal, 1) : 0;
  const remaining = Math.max(0, dailyGoal - todayTotal);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Droplets size={18} color={COLORS.water} />
            <Text style={styles.title}>Water</Text>
          </View>
          <Text style={styles.total}>
            {formatMl(todayTotal)}
            <Text style={styles.goal}> / {formatMl(dailyGoal)}</Text>
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* Remaining */}
        <Text style={styles.remaining}>
          {remaining > 0 ? `${formatMl(remaining)} remaining` : 'Goal reached!'}
        </Text>

        {/* Container buttons */}
        {containers.length > 0 ? (
          <View style={styles.buttons}>
            {containers.slice(0, 4).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.containerBtn}
                onPress={() => handleLog(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.containerBtnMl}>+{c.capacity_ml}</Text>
                <Text style={styles.containerBtnName} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.noContainers}>
            Add containers in Settings to enable quick logging
          </Text>
        )}

        {/* Undo toast */}
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
          <Text style={styles.toastText}>Water logged</Text>
          <TouchableOpacity onPress={handleUndo} hitSlop={8}>
            <Text style={styles.toastUndo}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      </Card>
    </TouchableOpacity>
  );
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${ml}ml`;
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
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.water,
  },
  goal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: COLORS.textMuted,
  },
  trackBg: {
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glassHighlight,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.water,
  },
  remaining: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  containerBtn: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.water,
    backgroundColor: `${COLORS.water}15`,
  },
  containerBtnMl: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.water,
  },
  containerBtnName: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  noContainers: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
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
    color: COLORS.water,
  },
});
