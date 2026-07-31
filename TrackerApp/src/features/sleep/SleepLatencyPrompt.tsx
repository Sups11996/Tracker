import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { COLORS, GLASS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface SleepLatencyPromptProps {
  visible: boolean;
  onConfirm: (latencyMinutes: number) => void;
  onCancel: () => void;
}

const PRESET_OPTIONS = [0, 5, 10, 15, 20, 30];

export function SleepLatencyPrompt({
  visible,
  onConfirm,
  onCancel,
}: SleepLatencyPromptProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(10);
  const [customValue, setCustomValue] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  function handlePresetSelect(minutes: number) {
    setSelectedPreset(minutes);
    setUseCustom(false);
    setCustomValue('');
  }

  function handleCustomFocus() {
    setUseCustom(true);
    setSelectedPreset(null);
  }

  function handleConfirm() {
    const latency = useCustom && customValue
      ? parseInt(customValue, 10)
      : selectedPreset ?? 0;
    
    if (isNaN(latency) || latency < 0) {
      return;
    }
    
    onConfirm(latency);
    resetState();
  }

  function handleCancel() {
    resetState();
    onCancel();
  }

  function resetState() {
    setSelectedPreset(10);
    setCustomValue('');
    setUseCustom(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <BlurView intensity={GLASS.blurOverlay} tint="dark" style={styles.overlay}>
        <View style={styles.overlayTint}>
          <View style={styles.container}>
            <BlurView intensity={GLASS.blurModal} tint="dark" style={styles.sheetBlur}>
              <View style={styles.sheetTint}>
                {/* Top accent line — sleep colour */}
                <View style={[styles.accentLine, { backgroundColor: COLORS.sleep }]} />

                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>How long to fall asleep?</Text>
                  <TouchableOpacity onPress={handleCancel} hitSlop={8}>
                    <X size={24} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.description}>
                  Select how many minutes it took you to fall asleep after getting into bed.
                </Text>

                {/* Preset chips */}
                <View style={styles.presetGrid}>
                  {PRESET_OPTIONS.map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.presetChip,
                        selectedPreset === minutes && styles.presetChipSelected,
                      ]}
                      onPress={() => handlePresetSelect(minutes)}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          selectedPreset === minutes && styles.presetTextSelected,
                        ]}
                      >
                        {minutes === 0 ? 'Instant' : `${minutes} min`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom input */}
                <View style={styles.customSection}>
                  <Text style={styles.customLabel}>Or enter custom time:</Text>
                  <TextInput
                    value={customValue}
                    onChangeText={setCustomValue}
                    onFocus={handleCustomFocus}
                    keyboardType="number-pad"
                    placeholder="e.g. 25"
                    style={styles.customInput}
                  />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <Button
                    label="Confirm"
                    onPress={handleConfirm}
                    variant="primary"
                    accentColor={COLORS.sleep}
                    style={styles.actionButton}
                  />
                  <Button
                    label="Cancel"
                    onPress={handleCancel}
                    variant="ghost"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </BlurView>
          </View>
        </View>
      </BlurView>
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
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: GLASS.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: GLASS.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    ...GLASS.shadow,
  },
  sheetBlur: {},
  sheetTint: {
    backgroundColor: GLASS.modalBg,
    gap: SPACING.lg,
    padding: SPACING.xl,
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
    flex: 1,
    paddingRight: SPACING.sm,
  },
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: GLASS.radiusInner,
    borderWidth: 1,
    borderColor: GLASS.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.05)',
    minWidth: 80,
    alignItems: 'center',
  },
  presetChipSelected: {
    borderColor: COLORS.sleep,
    backgroundColor: `${COLORS.sleep}20`,
  },
  presetText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
  },
  presetTextSelected: {
    color: COLORS.sleep,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  customSection: {
    gap: SPACING.sm,
  },
  customLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  customInput: {
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionButton: {
    flex: 1,
  },
});
