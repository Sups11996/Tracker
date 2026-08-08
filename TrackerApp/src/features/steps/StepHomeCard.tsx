import React, { useEffect } from 'react';
import {
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';
import { Footprints, PauseCircle, PlayCircle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { ProgressRing } from '../../components/ui/ProgressRing';
import {
  useStepStore,
  hydrateStepStore,
  subscribeToStepEvents,
  unsubscribeFromStepEvents,
} from '../../stores/stepStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

// Use classic NativeModules bridge
const StepServiceModule = Platform.OS === 'android' ? NativeModules.StepServiceModule : null;

interface StepHomeCardProps {
  onPress?: () => void;
}

export function StepHomeCard({ onPress }: StepHomeCardProps) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { todaySteps, todayDistance, todayCalories, dailyGoal, status } = useStepStore();

  // Initial hydration
  useEffect(() => {
    hydrateStepStore(db);
    subscribeToStepEvents();
    return () => unsubscribeFromStepEvents();
  }, []);

  // Re-check tracking state from DB when screen is focused
  useEffect(() => {
    if (!isFocused) return;

    async function reloadTrackingState() {
      try {
        const result = await db.getFirstAsync<{ is_tracking: number; is_paused: number }>(
          'SELECT is_tracking, is_paused FROM step_tracking_state WHERE id = 1'
        );
        
        if (result) {
          const isTracking = result.is_tracking === 1;
          const isPaused = result.is_paused === 1;
          
          if (!isTracking) {
            useStepStore.getState().setStatus('unavailable');
          } else if (isPaused) {
            useStepStore.getState().setStatus('paused');
          } else {
            useStepStore.getState().setStatus('tracking');
          }
        }
      } catch (error) {
      }
    }

    reloadTrackingState();
  }, [isFocused, db]);

  const progress  = dailyGoal > 0 ? todaySteps / dailyGoal : 0;
  const remaining = Math.max(0, dailyGoal - todaySteps);
  const distStr   = todayDistance >= 1000
    ? `${(todayDistance / 1000).toFixed(2)} km`
    : `${Math.round(todayDistance)} m`;
  const calStr    = `${Math.round(todayCalories)} kcal`;

  const statusColor =
    status === 'tracking' ? COLORS.success :
    status === 'paused'   ? COLORS.textMuted : COLORS.error;

  const statusLabel =
    status === 'tracking' ? 'Tracking' :
    status === 'paused'   ? 'Paused' : 'Unavailable';

  function sendServiceAction(action: string) {
    
    try {
      // Optimistically update status so UI responds immediately
      if (action === 'pause') {
        useStepStore.getState().setStatus('paused');
      } else if (action === 'resume') {
        useStepStore.getState().setStatus('tracking');
      }
      
      // Try to send action to native module if available
      if (Platform.OS === 'android' && StepServiceModule) {
        StepServiceModule.sendAction(action);
      } else {
      }
      
      // Update DB to persist the paused state (NOT is_tracking, only is_paused)
      const isPaused = action === 'pause' ? 1 : 0;
      db.runAsync(
        'UPDATE step_tracking_state SET is_paused = ?, updated_at = ? WHERE id = 1',
        [isPaused, new Date().toISOString()]
      ).then(() => {
      }).catch((error) => {
      });
      
    } catch (error) {
    }
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Footprints size={18} color={COLORS.steps} />
            <Text style={styles.title}>Steps</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.body}>
          <ProgressRing
            progress={progress}
            size={110}
            strokeWidth={9}
            color={COLORS.steps}
            centerLabel={todaySteps.toLocaleString()}
            centerSub="steps"
          />

          <View style={styles.stats}>
            <StatRow label="Goal"      value={`${dailyGoal.toLocaleString()} steps`} />
            <StatRow label="Remaining" value={remaining > 0 ? remaining.toLocaleString() : 'Done!'} accent={remaining === 0} />
            <StatRow label="Distance"  value={distStr} />
            <StatRow label="Calories"  value={calStr} />
          </View>
        </View>

        {/* Quick actions */}
        {(status === 'tracking' || status === 'paused') && (
          <View style={styles.actions}>
            <ActionBtn
              icon={status === 'paused'
                ? <PlayCircle  size={16} color={COLORS.steps} />
                : <PauseCircle size={16} color={COLORS.textMuted} />
              }
              label={status === 'paused' ? 'Resume' : 'Pause'}
              color={status === 'paused' ? COLORS.steps : COLORS.textMuted}
              onPress={() => sendServiceAction(
                status === 'paused' ? 'resume' : 'pause'
              )}
            />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function StatRow({ label, value, accent = false }: {
  label: string; value: string; accent?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: COLORS.success }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: {
  icon: React.ReactNode; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} hitSlop={8}>
      {icon}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.lg },
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  stats: {
    flex: 1,
    gap: SPACING.sm,
  },
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
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingTop: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.glassHighlight,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
