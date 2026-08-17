import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Moon, MoonStar, Play, Square, PenLine, Trash2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SleepLatencyPrompt } from './SleepLatencyPrompt';
import { ManualSleepModal } from './ManualSleepModal';
import {
  useSleepStore,
  hydrateSleepStore,
  startSleepSession,
  endSleepSession,
  deleteSleepSession,
} from '../../stores/sleepStore';
import { getTodayLocal, getYesterdayLocal } from '../../lib/dateUtils';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface SleepHomeCardProps {
  onPress?: () => void;
}

export function SleepHomeCard({ onPress }: SleepHomeCardProps) {
  const db = useSQLiteContext();
  const {
    isActive,
    sessionStartTime,
    elapsedMinutes,
    lastNightDuration,
    lastNightQuality,
    goalMinutes,
    recentSessions,
    updateElapsed,
  } = useSleepStore();

  const today = getTodayLocal();
  const yesterday = getYesterdayLocal();

  // Sessions for today and yesterday only
  const todaySessions = recentSessions.filter(s => s.date === today);
  const yesterdaySessions = recentSessions.filter(s => s.date === yesterday);

  const [showLatencyPrompt, setShowLatencyPrompt] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    hydrateSleepStore(db);
  }, []);

  // Update elapsed time every minute when active
  useEffect(() => {
    if (!isActive || !sessionStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);
      updateElapsed(elapsed);
    }, 60000);

    return () => clearInterval(interval);
  }, [isActive, sessionStartTime]);

  async function handleStartSleep() {
    try {
      await startSleepSession(db);
    } catch (error) {
    }
  }

  function handleEndSleep() {
    setShowLatencyPrompt(true);
  }

  async function handleLatencyConfirm(latencyMinutes: number) {
    try {
      await endSleepSession(db, latencyMinutes);
      setShowLatencyPrompt(false);
      await hydrateSleepStore(db); // Refresh to show last night stats
    } catch (error) {
    }
  }

  function handleLatencyCancel() {
    setShowLatencyPrompt(false);
  }

  async function handleDelete(sessionId: number) {
    Alert.alert('Delete Session', 'Remove this sleep session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSleepSession(db, sessionId);
          } catch {}
        }
      },
    ]);
  }

  const qualityColor =
    lastNightQuality === 'good' ? COLORS.success :
    lastNightQuality === 'fair' ? COLORS.water :
    lastNightQuality === 'poor' ? COLORS.calories : COLORS.textMuted;

  const qualityLabel =
    lastNightQuality === 'good' ? 'Great' :
    lastNightQuality === 'fair' ? 'Fair' :
    lastNightQuality === 'poor' ? 'Poor' : '—';

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;

  // Determine if last session is from today or yesterday for label
  const lastSession = recentSessions.find(s => s.is_active === 0);
  const lastSessionDate = lastSession?.date;
  const lastNightLabel =
    lastSessionDate === today ? "Today's Sleep" :
    lastSessionDate === yesterday ? "Yesterday's Sleep" :
    lastSessionDate ? `Sleep (${lastSessionDate})` :
    "Last Sleep";

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Moon size={18} color={COLORS.sleep} />
            <Text style={styles.title}>Sleep</Text>
          </View>
          {isActive && (
            <View style={[styles.statusBadge, { borderColor: COLORS.sleep }]}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.sleep }]} />
              <Text style={[styles.statusText, { color: COLORS.sleep }]}>Sleeping</Text>
            </View>
          )}
        </View>

        {/* Main content */}
        {isActive ? (
          <View style={styles.activeSession}>
            <MoonStar size={48} color={COLORS.sleep} />
            <Text style={styles.elapsedTime}>{elapsedHours}h {elapsedMins}m</Text>
            <Text style={styles.elapsedLabel}>Time in bed</Text>
            <Button
              label="End Sleep"
              onPress={handleEndSleep}
              variant="secondary"
              accentColor={COLORS.sleep}
              style={styles.endButton}
            />
          </View>
        ) : (
          <View style={styles.body}>
            {lastNightDuration !== null ? (
              <View style={styles.stats}>
                <StatRow
                  label={lastNightLabel}
                  value={formatDuration(lastNightDuration)}
                />
                <StatRow
                  label="Quality"
                  value={qualityLabel}
                  valueColor={qualityColor}
                />
                <StatRow
                  label="Goal"
                  value={formatDuration(goalMinutes)}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Moon size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No sleep data yet</Text>
                <Text style={styles.emptySubtext}>Start tracking your sleep tonight</Text>
              </View>
            )}

            <Button
              label="Start Sleep"
              onPress={handleStartSleep}
              variant="primary"
              accentColor={COLORS.sleep}
              style={styles.startButton}
            />
            <TouchableOpacity style={styles.manualBtn} onPress={() => setShowManualModal(true)} activeOpacity={0.7}>
              <PenLine size={14} color={COLORS.textMuted} />
              <Text style={styles.manualBtnText}>Log past sleep / nap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's + Yesterday's sleep logs removed — shown in Sleep Dashboard instead */}
      </Card>
    </TouchableOpacity>

    <SleepLatencyPrompt
      visible={showLatencyPrompt}
      onConfirm={handleLatencyConfirm}
      onCancel={handleLatencyCancel}
    />
    <ManualSleepModal
      visible={showManualModal}
      onClose={() => { setShowManualModal(false); hydrateSleepStore(db); }}
    />
  </>
  );
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
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
    gap: SPACING.lg,
  },
  activeSession: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  elapsedTime: {
    fontSize: 40,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.sleep,
  },
  elapsedLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginTop: -SPACING.sm,
  },
  endButton: {
    marginTop: SPACING.sm,
  },
  stats: {
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
  emptyState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  startButton: {
    marginTop: SPACING.sm,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  manualBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
});
