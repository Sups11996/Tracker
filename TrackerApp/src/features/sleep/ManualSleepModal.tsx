import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Moon, Coffee, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { logManualSleep } from '../../stores/sleepStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface ManualSleepModalProps {
  visible: boolean;
  onClose: () => void;
}

type SessionType = 'night' | 'nap';

interface TimeState {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

const MAX_DAYS_AGO = 7;

function isValidHour12(h: string) {
  const n = parseInt(h, 10);
  return h.length > 0 && !isNaN(n) && n >= 1 && n <= 12;
}

function isValidMinute(m: string) {
  const n = parseInt(m, 10);
  return m.length > 0 && !isNaN(n) && n >= 0 && n <= 59;
}

/** Convert a TimeState + a Date base to a timestamp */
function toMs(time: TimeState, baseDate: Date): number | null {
  if (!isValidHour12(time.hour) || !isValidMinute(time.minute)) return null;
  let h = parseInt(time.hour, 10);
  const m = parseInt(time.minute, 10);
  if (time.period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** End timestamp — rolls over midnight if end <= start */
function toEndMs(endTime: TimeState, startMs: number): number | null {
  if (!isValidHour12(endTime.hour) || !isValidMinute(endTime.minute)) return null;
  let h = parseInt(endTime.hour, 10);
  const m = parseInt(endTime.minute, 10);
  if (endTime.period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  const d = new Date(startMs);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= startMs) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Format a date offset as a readable label */
function dateLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
}

/** Build a Date object for N days ago (time zeroed) */
function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function TimeField({
  label,
  time,
  onChange,
  hourRef,
}: {
  label: string;
  time: TimeState;
  onChange: (t: TimeState) => void;
  hourRef?: React.RefObject<TextInput | null>;
}) {
  const internalHourRef = useRef<TextInput>(null);
  const resolvedHourRef = hourRef ?? internalHourRef;
  const minuteRef = useRef<TextInput>(null);
  const allValid = isValidHour12(time.hour) && isValidMinute(time.minute);

  function handleHourChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    onChange({ ...time, hour: digits });
    if (digits.length === 2 || (digits.length === 1 && parseInt(digits, 10) > 1)) {
      minuteRef.current?.focus();
    }
  }

  function handleMinuteChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    onChange({ ...time, minute: digits });
  }

  function handleMinuteBackspace(e: { nativeEvent: { key: string } }) {
    if (e.nativeEvent.key === 'Backspace' && time.minute === '') {
      resolvedHourRef.current?.focus();
    }
  }

  return (
    <View style={tf.block}>
      <Text style={tf.label}>{label}</Text>
      <View style={[tf.inputRow, allValid && tf.inputRowValid]}>
        <TextInput
          ref={resolvedHourRef}
          style={tf.segment}
          value={time.hour}
          onChangeText={handleHourChange}
          keyboardType="number-pad"
          placeholder="12"
          placeholderTextColor={COLORS.textMuted}
          maxLength={2}
          returnKeyType="next"
          onSubmitEditing={() => minuteRef.current?.focus()}
        />
        <Text style={tf.colon}>:</Text>
        <TextInput
          ref={minuteRef}
          style={tf.segment}
          value={time.minute}
          onChangeText={handleMinuteChange}
          onKeyPress={handleMinuteBackspace}
          keyboardType="number-pad"
          placeholder="00"
          placeholderTextColor={COLORS.textMuted}
          maxLength={2}
          returnKeyType="done"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={tf.periodBtn}
          onPress={() => onChange({ ...time, period: time.period === 'AM' ? 'PM' : 'AM' })}
          activeOpacity={0.7}
        >
          <Text style={tf.periodText}>{time.period}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tf = StyleSheet.create({
  block: { flex: 1, gap: 4 },
  label: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    gap: 2,
  },
  inputRowValid: { borderColor: COLORS.sleep },
  segment: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  colon: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  periodBtn: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    backgroundColor: `${COLORS.sleep}30`,
    borderRadius: RADIUS.sm,
    marginLeft: 2,
  },
  periodText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.sleep },
});

export function ManualSleepModal({ visible, onClose }: ManualSleepModalProps) {
  const db = useSQLiteContext();

  const [type, setType] = useState<SessionType>('night');
  const [daysAgo, setDaysAgo] = useState(1); // default: yesterday for night sleep
  const [start, setStart] = useState<TimeState>({ hour: '10', minute: '00', period: 'PM' });
  const [end, setEnd] = useState<TimeState>({ hour: '6', minute: '00', period: 'AM' });
  const [saving, setSaving] = useState(false);

  const startHourRef = useRef<TextInput>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setType('night');
      setDaysAgo(1);
      setStart({ hour: '10', minute: '00', period: 'PM' });
      setEnd({ hour: '6', minute: '00', period: 'AM' });
    } else {
      const timer = setTimeout(() => startHourRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // When switching type, set a sensible default daysAgo
  function handleTypeChange(newType: SessionType) {
    setType(newType);
    if (newType === 'night') {
      setDaysAgo(1);
      setStart({ hour: '10', minute: '00', period: 'PM' });
      setEnd({ hour: '6', minute: '00', period: 'AM' });
    } else {
      setDaysAgo(0);
      setStart({ hour: '1', minute: '00', period: 'PM' });
      setEnd({ hour: '2', minute: '00', period: 'PM' });
    }
  }

  function getDurationLabel(): string {
    const base = daysAgoDate(daysAgo);
    const s = toMs(start, base);
    if (!s) return '';
    // Use toEndMs for both night and nap — handles midnight rollover automatically
    const e = toEndMs(end, s);
    if (!e) return '';
    const diff = e - s;
    if (diff <= 0) return 'End must be after start';
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  async function handleSave() {
    const base = daysAgoDate(daysAgo);
    const startMs = toMs(start, base);
    if (!startMs) {
      Alert.alert('Invalid Time', 'Please enter a valid start time.');
      return;
    }
    const endMs = toEndMs(end, startMs);
    if (!endMs) {
      Alert.alert('Invalid Time', 'Please enter a valid end time.');
      return;
    }
    if (endMs <= startMs) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }
    if (Math.floor((endMs - startMs) / 60000) < 5) {
      Alert.alert('Too Short', 'Sleep duration must be at least 5 minutes.');
      return;
    }

    setSaving(true);
    try {
      await logManualSleep(db, type, startMs, endMs);
      setSaving(false);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save sleep session.');
      setSaving(false);
    }
  }

  const durationLabel = getDurationLabel();
  const isInvalid = durationLabel === 'End must be after start';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modal}>
          <Text style={styles.title}>Log Sleep</Text>

          {/* Session type */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'night' && styles.typeBtnActive]}
              onPress={() => handleTypeChange('night')}
              activeOpacity={0.7}
            >
              <Moon size={15} color={type === 'night' ? COLORS.sleep : COLORS.textMuted} />
              <Text style={[styles.typeBtnText, type === 'night' && styles.typeBtnTextActive]}>Night Sleep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'nap' && styles.typeBtnActive]}
              onPress={() => handleTypeChange('nap')}
              activeOpacity={0.7}
            >
              <Coffee size={15} color={type === 'nap' ? COLORS.sleep : COLORS.textMuted} />
              <Text style={[styles.typeBtnText, type === 'nap' && styles.typeBtnTextActive]}>Nap</Text>
            </TouchableOpacity>
          </View>

          {/* Date picker — how many days ago */}
          <View style={styles.datePicker}>
            <TouchableOpacity
              style={[styles.dateArrow, daysAgo >= MAX_DAYS_AGO && styles.dateArrowDisabled]}
              onPress={() => setDaysAgo(d => Math.min(d + 1, MAX_DAYS_AGO))}
              disabled={daysAgo >= MAX_DAYS_AGO}
              hitSlop={8}
            >
              <ChevronLeft size={18} color={daysAgo >= MAX_DAYS_AGO ? COLORS.textMuted : COLORS.sleep} />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{dateLabel(daysAgo)}</Text>
            <TouchableOpacity
              style={[styles.dateArrow, daysAgo <= 0 && styles.dateArrowDisabled]}
              onPress={() => setDaysAgo(d => Math.max(d - 1, 0))}
              disabled={daysAgo <= 0}
              hitSlop={8}
            >
              <ChevronRight size={18} color={daysAgo <= 0 ? COLORS.textMuted : COLORS.sleep} />
            </TouchableOpacity>
          </View>

          {/* Time fields */}
          <View style={styles.timeRow}>
            <TimeField label="Start Time" time={start} onChange={setStart} hourRef={startHourRef} />
            <Text style={styles.arrow}>→</Text>
            <TimeField label="End Time" time={end} onChange={setEnd} />
          </View>

          {/* Duration */}
          {durationLabel.length > 0 && (
            <Text style={[styles.duration, { color: isInvalid ? COLORS.error : COLORS.sleep }]}>
              {isInvalid ? durationLabel : `Duration: ${durationLabel}`}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Button label="Cancel" onPress={onClose} variant="ghost" size="sm" accentColor={COLORS.sleep} style={{ flex: 1 }} />
            <Button label={saving ? 'Saving...' : 'Save'} onPress={handleSave} variant="primary" size="sm" accentColor={COLORS.sleep} style={{ flex: 1 }} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 250,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: 320,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surface,
  },
  typeBtnActive: { borderColor: COLORS.sleep, backgroundColor: `${COLORS.sleep}20` },
  typeBtnText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weight.medium },
  typeBtnTextActive: { color: COLORS.sleep, fontWeight: TYPOGRAPHY.weight.bold },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  dateArrow: {
    padding: 4,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  arrow: { fontSize: TYPOGRAPHY.size.xl, color: COLORS.textMuted, marginTop: SPACING.lg },
  duration: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
});
