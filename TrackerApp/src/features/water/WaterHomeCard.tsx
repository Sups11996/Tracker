import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { BlurView } from 'expo-blur';
import { Droplets } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  useWaterStore,
  hydrateWaterStore,
  logWater,
} from '../../stores/waterStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface WaterHomeCardProps {
  onPress?: () => void;
}

export function WaterHomeCard({ onPress }: WaterHomeCardProps) {
  const db = useSQLiteContext();
  const { todayTotal, dailyGoal, containers } = useWaterStore();

  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customMl, setCustomMl] = React.useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { hydrateWaterStore(db); }, []);

  async function handleLog(container: typeof containers[0]) {
    try { 
      await logWater(db, container); 
    } catch (e) {
      console.error('[WaterHomeCard] Log water failed:', e);
    }
  }

  function openCustomInput() {
    setCustomMl('');
    setShowCustomInput(true);
  }

  function cancelCustom() {
    setCustomMl('');
    setShowCustomInput(false);
  }

  async function confirmCustom() {
    const ml = parseInt(customMl, 10);
    if (!isNaN(ml) && ml > 0 && ml <= 5000) {
      try {
        await logWater(db, { id: -1, name: 'Custom', capacity_ml: ml, sort_order: 999 });
      } catch {
        Alert.alert('Error', 'Failed to log water. Please try again.');
        return;
      }
    } else if (!isNaN(ml) && ml > 5000) {
      Alert.alert('Too Much', 'Please enter an amount up to 5000ml.');
      return;
    }
    setCustomMl('');
    setShowCustomInput(false);
  }

  const progress = dailyGoal > 0 ? Math.min(todayTotal / dailyGoal, 1) : 0;
  const remaining = Math.max(0, dailyGoal - todayTotal);
  const visibleContainers = containers;

  return (
    <>
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
          <View style={styles.buttons}>
            {visibleContainers.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.containerBtn}
                onPress={() => handleLog(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.containerBtnMl}>+{c.capacity_ml}</Text>
                <Text style={styles.containerBtnName} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.customBtn}
              onPress={openCustomInput}
              activeOpacity={0.7}
            >
              <Text style={styles.containerBtnMl}>+</Text>
              <Text style={styles.containerBtnName}>Custom</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Custom Input Modal */}
      <Modal
        visible={showCustomInput}
        transparent
        animationType="fade"
        onRequestClose={cancelCustom}
        statusBarTranslucent
        onShow={() => {
          // Focus input after modal is shown
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={cancelCustom}
          >
            <View>
              <BlurView intensity={80} tint="dark" style={styles.modalContent}>
                <View style={styles.modalInner}>
                <Text style={styles.modalTitle}>Custom Amount</Text>
                <TextInput
                  ref={inputRef}
                  value={customMl}
                  onChangeText={setCustomMl}
                  keyboardType="number-pad"
                  placeholder="Amount in ml"
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={confirmCustom}
                  style={styles.modalInput}
                />
                <View style={styles.modalButtons}>
                  <Button
                    label="Cancel"
                    onPress={cancelCustom}
                    variant="ghost"
                    size="sm"
                    accentColor={COLORS.water}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Log"
                    onPress={confirmCustom}
                    variant="primary"
                    size="sm"
                    accentColor={COLORS.water}
                    style={{ flex: 1 }}
                  />
                </View>
                </View>
              </BlurView>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${ml}ml`;
}

const styles = StyleSheet.create({
  card: { gap: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  title: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textPrimary },
  total: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.water },
  goal: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.regular, color: COLORS.textMuted },
  trackBg: { height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.glassHighlight, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: COLORS.water },
  remaining: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textMuted },
  buttons: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
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
  containerBtnMl: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.water },
  containerBtnName: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, marginTop: 2 },
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: 200,
  },
  modalContent: {
    borderRadius: RADIUS.lg,
    padding: 0,
    width: 300,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  modalInner: {
    backgroundColor: 'rgba(14, 16, 26, 0.97)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
