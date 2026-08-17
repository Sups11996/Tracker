import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { calcWorkoutCalories, type Intensity } from '../../stores/caloriesStore';
import { COLORS, GLASS, MOTION, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

const INTENSITY_OPTIONS: { key: Intensity; label: string; desc: string }[] = [
  { key: 'light',    label: 'Light',    desc: 'Walking, stretching' },
  { key: 'moderate', label: 'Moderate', desc: 'Jogging, cycling' },
  { key: 'intense',  label: 'Intense',  desc: 'Running, HIIT' },
];

interface WorkoutLogModalProps {
  visible: boolean;
  weightKg: number;
  onSave: (durationMins: number, intensity: Intensity, note: string, customCalories?: number) => void;
  onCancel: () => void;
}

export function WorkoutLogModal({
  visible,
  weightKg,
  onSave,
  onCancel,
}: WorkoutLogModalProps) {
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [note, setNote] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [useCustomCalories, setUseCustomCalories] = useState(false);

  const activeDuration = useCustom && customDuration
    ? parseInt(customDuration, 10) || 0
    : duration;

  const calculatedCalories = activeDuration > 0
    ? calcWorkoutCalories(activeDuration, intensity, weightKg)
    : 0;

  const estCalories = useCustomCalories && customCalories
    ? parseInt(customCalories, 10) || 0
    : calculatedCalories;

  function handleSave() {
    if (activeDuration < 1) return;
    const caloriesOverride = useCustomCalories && customCalories
      ? parseInt(customCalories, 10)
      : undefined;
    // Guard against NaN or negative custom calories
    if (caloriesOverride !== undefined && (isNaN(caloriesOverride) || caloriesOverride < 0)) return;
    onSave(activeDuration, intensity, note.trim(), caloriesOverride);
  }

  function handleCancel() {
    onCancel();
    // Don't reset immediately - let modal close first
  }

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      // Delay reset until after modal close animation
      const timer = setTimeout(() => {
        setDuration(30);
        setCustomDuration('');
        setUseCustom(false);
        setIntensity('moderate');
        setNote('');
        setCustomCalories('');
        setUseCustomCalories(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Dim scrim — strong blur so background is properly obscured */}
        <BlurView intensity={90} tint="dark" style={styles.overlay}>
          <TouchableOpacity 
            style={styles.overlayTint}
            activeOpacity={1}
            onPress={handleCancel}
          >
            {/* Modal sheet — full glass surface */}
            <TouchableOpacity 
              style={styles.container}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <BlurView intensity={GLASS.blurModal} tint="dark" style={{ borderRadius: GLASS.radius }}>
                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.sheetTint}>
                    {/* Top accent line — calories colour */}
                    <View style={[styles.accentLine, { backgroundColor: COLORS.calories }]} />

                    {/* Header */}
                    <View style={styles.header}>
                      <Text style={styles.title}>Log Workout</Text>
                      <TouchableOpacity onPress={handleCancel} hitSlop={8}>
                        <X size={24} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.chips}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, !useCustom && duration === d && styles.chipActive]}
                    onPress={() => { setDuration(d); setUseCustom(false); }}
                  >
                    <Text style={[styles.chipText, !useCustom && duration === d && styles.chipTextActive]}>
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={customDuration}
                onChangeText={setCustomDuration}
                onFocus={() => setUseCustom(true)}
                keyboardType="number-pad"
                placeholder="Custom (mins)"
                style={styles.customInput}
              />
            </View>

            {/* Intensity */}
            <View style={styles.section}>
              <Text style={styles.label}>Intensity</Text>
              {INTENSITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.intensityRow, intensity === opt.key && styles.intensityActive]}
                  onPress={() => setIntensity(opt.key)}
                >
                  <View>
                    <Text style={[styles.intensityLabel, intensity === opt.key && { color: COLORS.calories }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.intensityDesc}>{opt.desc}</Text>
                  </View>
                  {intensity === opt.key && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Note */}
            <View style={styles.section}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Leg day, morning run..."
                style={styles.customInput}
              />
            </View>

            {/* Custom Calories */}
            <View style={styles.section}>
              <Text style={styles.label}>Custom Calories (override the estimated) - Optional</Text>
              <TextInput
                value={customCalories}
                onChangeText={setCustomCalories}
                onFocus={() => setUseCustomCalories(true)}
                onBlur={() => { if (!customCalories) setUseCustomCalories(false); }}
                keyboardType="number-pad"
                placeholder={`Estimated: ${calculatedCalories} kcal`}
                style={styles.customInput}
              />
              {useCustomCalories && customCalories && (
                <Text style={styles.calorieNote}>
                  Using custom value instead of estimated {calculatedCalories} kcal
                </Text>
              )}
            </View>

            {/* Estimate */}
            {estCalories > 0 && (
              <View style={styles.estimate}>
                <Text style={styles.estimateText}>
                  {useCustomCalories ? 'Custom: ' : 'Estimated: '}
                  <Text style={{ color: COLORS.calories, fontWeight: TYPOGRAPHY.weight.bold }}>{estCalories} kcal</Text>
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Button label="Cancel" onPress={handleCancel} variant="ghost" style={styles.actionBtn} />
              <Button label="Log Workout" onPress={handleSave} variant="primary" accentColor={COLORS.calories} style={styles.actionBtn} />
            </View>
                  </View>
              </ScrollView>
            </BlurView>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTint: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: GLASS.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    ...GLASS.shadow,
  },
  scrollView: {
  },
  scrollContent: {
  },
  sheetTint: {
    backgroundColor: GLASS.modalBg,
    gap: SPACING.lg,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  accentLine: {
    height: 3,
    borderRadius: 2,
    width: 40,
    alignSelf: 'center',
    marginBottom: SPACING.xs,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  section: { gap: SPACING.sm },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: GLASS.radiusInner,
    borderWidth: 1,
    borderColor: GLASS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: {
    borderColor: COLORS.calories,
    backgroundColor: `${COLORS.calories}20`,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.calories,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  customInput: { width: '100%' },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: GLASS.radiusInner,
    borderWidth: 1,
    borderColor: GLASS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  intensityActive: {
    borderColor: COLORS.calories,
    backgroundColor: `${COLORS.calories}15`,
  },
  intensityLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  intensityDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.calories,
  },
  estimate: {
    padding: SPACING.md,
    borderRadius: GLASS.radiusInner,
    backgroundColor: `${COLORS.calories}18`,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.calories}30`,
  },
  estimateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
  },
  calorieNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1 },
});
