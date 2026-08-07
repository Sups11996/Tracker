import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Droplets, Plus } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import {
  useWaterStore,
  hydrateWaterStore,
  logWater,
  undoLastLog,
} from '../../stores/waterStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, GLASS } from '../../constants';

interface WaterHomeCardProps {
  onPress?: () => void;
}

export function WaterHomeCard({ onPress }: WaterHomeCardProps) {
  const db = useSQLiteContext();
  const { todayTotal, dailyGoal, containers, undoStack } = useWaterStore();

  const [customModalVisible, setCustomModalVisible] = React.useState(false);
  const [customMl, setCustomMl] = React.useState('');

  useEffect(() => {
    hydrateWaterStore(db);
  }, []);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastVisible = useRef(false);
  const [toastMounted, setToastMounted] = React.useState(false);

  const hasUndo = undoStack.length > 0;
  useEffect(() => {
    if (hasUndo && !toastVisible.current) {
      toastVisible.current = true;
      setToastMounted(true);
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (!hasUndo && toastVisible.current) {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        toastVisible.current = false;
        setToastMounted(false);
      });
    }
  }, [hasUndo]);

  async function handleLog(container: typeof containers[0]) {
    try {
      await logWater(db, container);
    } catch (e) {}
  }

  async function handleUndo() {
    try {
      await undoLastLog(db);
    } catch (e) {}
  }

  async function handleCustomLog() {
    const ml = parseInt(customMl, 10);
    if (!isNaN(ml) && ml > 0) {
      await logWater(db, { id: -1, name: 'Custom', capacity_ml: ml });
    }
    setCustomMl('');
    setCustomModalVisible(false);
  }

  const progress = dailyGoal > 0 ? Math.min(todayTotal / dailyGoal, 1) : 0;
  const remaining = Math.max(0, dailyGoal - todayTotal);
  // Show all containers
  const visibleContainers = containers;

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

        {/* Container buttons + custom */}
        {containers.length > 0 ? (
          <View style={styles.buttons}>
            {visibleContainers.map((c) => (
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
            {/* Custom ml button */}
            <TouchableOpacity
              style={styles.customBtn}
              onPress={() => setCustomModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={16} color={COLORS.water} />
              <Text style={styles.containerBtnName}>Custom</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.containerBtn, { flex: 1 }]}
              onPress={() => setCustomModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={16} color={COLORS.water} />
              <Text style={styles.containerBtnName}>Log Custom</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Custom ml modal */}
        <Modal
          visible={customModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCustomModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => { setCustomMl(''); setCustomModalVisible(false); }}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
              <Text style={styles.modalTitle}>Custom Amount</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.mlInput}
                  value={customMl}
                  onChangeText={setCustomMl}
                  keyboardType="number-pad"
                  placeholder="e.g. 350"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={handleCustomLog}
                />
                <Text style={styles.mlUnit}>ml</Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => { setCustomMl(''); setCustomModalVisible(false); }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirm}
                  onPress={handleCustomLog}
                >
                  <Text style={styles.modalConfirmText}>Log</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

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
            pointerEvents={hasUndo ? 'auto' : 'none'}
          >
            <Text style={styles.toastText}>
              {undoStack.length === 1
                ? 'Water logged'
                : `${undoStack.length} logs (${undoStack.reduce((sum, e) => sum + e.amount, 0)}ml)`}
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
    width: '22%',
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
  customBtn: {
    width: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.water,
    borderStyle: 'dashed',
    backgroundColor: `${COLORS.water}08`,
    gap: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '30%',
  },
  modalBox: {
    width: 280,
    backgroundColor: GLASS.modalBg,
    borderRadius: GLASS.radius,
    padding: SPACING.xl,
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: GLASS.border,
    ...GLASS.shadow,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  mlInput: {
    width: 120,
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.water,
    backgroundColor: COLORS.glassHighlight,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    textAlign: 'center',
  },
  mlUnit: {
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.water,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.bold,
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
