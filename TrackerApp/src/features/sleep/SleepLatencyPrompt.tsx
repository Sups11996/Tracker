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
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

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
      <BlurView intensity={40} style={styles.overlay}>
        <View style={styles.container}>
          <Card style={styles.card}>
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
          </Card>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  card: {
    gap: SPACING.lg,
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
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassHighlight,
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
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
});
