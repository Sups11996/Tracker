import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, GLASS } from '../../constants';

export interface TimePickerModalProps {
  visible: boolean;
  hour: number;
  minute: number;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
  title?: string;
  accentColor?: string;
}

function to12Hour(h: number) {
  return { hour: h % 12 || 12, period: (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM' };
}
function to24Hour(h: number, p: 'AM' | 'PM') {
  if (p === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

export function TimePickerModal({
  visible,
  hour,
  minute,
  onConfirm,
  onCancel,
  title = 'Set Time',
  accentColor = COLORS.sleep,
}: TimePickerModalProps) {
  const init = to12Hour(hour);
  const [hourInput, setHourInput] = useState(init.hour.toString());
  const [minuteInput, setMinuteInput] = useState(minute.toString().padStart(2, '0'));
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);
  const [hourError, setHourError] = useState<string | null>(null);
  const [minError, setMinError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'hour' | 'minute'>('hour');

  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      const h = to12Hour(hour);
      setHourInput(h.hour.toString());
      setMinuteInput(minute.toString().padStart(2, '0'));
      setPeriod(h.period);
      setHourError(null);
      setMinError(null);
      setFocusedField('hour');
      isClosing.current = false;
    }
  }, [visible, hour, minute]);

  // ── Numpad input ──────────────────────────────────────────────────────────
  function handleNumpadPress(num: number) {
    if (focusedField === 'hour') {
      const newVal = num.toString();
      
      // If already at 2 digits, replace with new digit
      if (hourInput.length === 2) {
        setHourInput(newVal);
        setHourError(null);
        return;
      }
      
      // Try to append
      const combined = parseInt(hourInput + newVal, 10);
      if (combined > 12) {
        // If appending exceeds max, just use the new digit
        setHourInput(newVal);
      } else {
        // Appending is valid
        setHourInput(hourInput + newVal);
      }
      setHourError(null);
    } else {
      const newVal = num.toString();
      
      // If already at 2 digits, replace with new digit
      if (minuteInput.length === 2) {
        setMinuteInput(newVal);
        setMinError(null);
        return;
      }
      
      // Try to append
      const combined = parseInt(minuteInput + newVal, 10);
      if (combined > 59) {
        // If appending exceeds max, just use the new digit
        setMinuteInput(newVal);
      } else {
        // Appending is valid
        setMinuteInput(minuteInput + newVal);
      }
      setMinError(null);
    }
  }

  function handleBackspace() {
    if (focusedField === 'hour') {
      setHourInput(hourInput.slice(0, -1));
      setHourError(null);
    } else {
      setMinuteInput(minuteInput.slice(0, -1));
      setMinError(null);
    }
  }

  // ── AM/PM ─────────────────────────────────────────────────────────────────
  function handlePeriodPress(p: 'AM' | 'PM') {
    setPeriod(p);
  }

  // ── Overlay tap ───────────────────────────────────────────────────────────
  function handleOverlayPress() {
    if (isClosing.current) return;
    isClosing.current = true;
    onCancel();
  }

  function handleCancel() {
    if (isClosing.current) return;
    isClosing.current = true;
    onCancel();
  }

  function handleConfirm() {
    if (isClosing.current) return;
    isClosing.current = true;
    const h = parseInt(hourInput, 10);
    const m = parseInt(minuteInput, 10);
    if (isNaN(h) || h < 1 || h > 12) {
      setHourError('Enter 1–12');
      isClosing.current = false;
      return;
    }
    if (isNaN(m) || m < 0 || m > 59) {
      setMinError('Enter 0–59');
      isClosing.current = false;
      return;
    }
    onConfirm(to24Hour(h, period), m);
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  const hNum = parseInt(hourInput, 10);
  const mNum = parseInt(minuteInput, 10);
  const ok = !isNaN(hNum) && !isNaN(mNum) && hNum >= 1 && hNum <= 12 && mNum >= 0 && mNum <= 59;
  const previewH = ok ? hNum.toString() : '--';
  const previewM = ok ? mNum.toString().padStart(2, '0') : '--';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      {/* Full screen container */}
      <View style={styles.root}>
        {/* Overlay — tapping here closes modal */}
        <TouchableWithoutFeedback onPress={handleOverlayPress}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <View style={styles.sheet}>
          <Text style={styles.titleText}>{title}</Text>

          <Text style={[styles.preview, { color: accentColor }]}>
            {previewH}:{previewM}{' '}
            <Text style={styles.previewPeriod}>{period}</Text>
          </Text>

          {/* Display Fields */}
          <View style={styles.displayRow}>
            <TouchableOpacity
              style={[
                styles.displayField,
                focusedField === 'hour' && { borderColor: accentColor, borderWidth: 2 },
              ]}
              onPress={() => setFocusedField('hour')}
            >
              <Text style={styles.displayValue}>{hourInput || '--'}</Text>
              <Text style={styles.displayLabel}>Hour</Text>
              {hourError && <Text style={styles.errorText}>{hourError}</Text>}
            </TouchableOpacity>

            <Text style={styles.colon}>:</Text>

            <TouchableOpacity
              style={[
                styles.displayField,
                focusedField === 'minute' && { borderColor: accentColor, borderWidth: 2 },
              ]}
              onPress={() => setFocusedField('minute')}
            >
              <Text style={styles.displayValue}>{minuteInput || '--'}</Text>
              <Text style={styles.displayLabel}>Minute</Text>
              {minError && <Text style={styles.errorText}>{minError}</Text>}
            </TouchableOpacity>

            {/* AM / PM */}
            <View style={styles.periodGroup}>
              {(['AM', 'PM'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    period === p
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : { borderColor: COLORS.glassBorder },
                  ]}
                  onPress={() => handlePeriodPress(p)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === p && { color: '#fff', fontWeight: '700' },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Numpad Grid */}
          <View style={styles.numpadContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.numpadBtn}
                onPress={() => handleNumpadPress(num)}
                activeOpacity={0.7}
              >
                <Text style={styles.numpadText}>{num}</Text>
              </TouchableOpacity>
            ))}
            {/* 0 button spans 2 spaces, backspace on right */}
            <TouchableOpacity
              style={[styles.numpadBtn, { flex: 2 }]}
              onPress={() => handleNumpadPress(0)}
              activeOpacity={0.7}
            >
              <Text style={styles.numpadText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.numpadBtn}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Text style={styles.numpadText}>⌫</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: GLASS.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  titleText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  preview: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  previewPeriod: {
    fontSize: 26,
    fontWeight: '600',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  displayField: {
    width: 80,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassHighlight,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  displayValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minHeight: 40,
  },
  displayLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.error,
    fontWeight: '600',
  },
  colon: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  periodGroup: {
    gap: SPACING.sm,
    marginTop: 4,
  },
  periodBtn: {
    width: 58,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  numpadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  numpadBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  numpadText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    color: '#fff',
  },
});
