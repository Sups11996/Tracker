import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Minus, Plus } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { useUserStore } from '../../../stores/userStore';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'WaterContainers'>;

interface ContainerDraft {
  name: string;
  capacity_ml: number;
}

const PRESETS: ContainerDraft[] = [
  { name: 'Small Cup',    capacity_ml: 200 },
  { name: 'Large Cup',    capacity_ml: 350 },
  { name: 'Water Bottle', capacity_ml: 500 },
  { name: 'Big Bottle',   capacity_ml: 750 },
];

export function WaterContainersScreen() {
  const navigation = useNavigation<Nav>();
  const db = useSQLiteContext();
  const { data: onboarding } = useOnboardingStore();
  const { setProfile } = useUserStore();
  const { showError } = useCustomAlert();
  const [containers, setContainers] = useState<ContainerDraft[]>([PRESETS[2]]);
  const [saving, setSaving] = useState(false);

  function addPreset(preset: ContainerDraft) {
    if (!containers.some((c) => c.name === preset.name)) {
      setContainers((prev) => [...prev, preset]);
    }
  }

  function remove(index: number) {
    if (containers.length > 1) {
      setContainers((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function updateName(index: number, name: string) {
    setContainers((prev) =>
      prev.map((c, i) => (i === index ? { ...c, name } : c))
    );
  }

  function updateCapacity(index: number, delta: number) {
    setContainers((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, capacity_ml: Math.max(50, Math.min(2000, c.capacity_ml + delta)) }
          : c
      )
    );
  }

  async function handleFinish() {
    if (containers.some((c) => !c.name.trim())) {
      showError('Missing name', 'Please give each container a name.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const ts  = Date.now();

      await db.runAsync(
        `INSERT OR REPLACE INTO user_profile
           (id, username, gender, age, height_cm, weight_kg,
            water_goal_ml, uses_gym, uses_abc,
            onboarding_complete, created_at, updated_at)
         VALUES (1,?,?,?,?,?,?,?,?,1,?,?)`,
        onboarding.username,
        onboarding.gender,
        parseInt(onboarding.age, 10),
        parseFloat(onboarding.height_cm),
        parseFloat(onboarding.weight_kg),
        parseInt(onboarding.water_goal_ml, 10),
        onboarding.uses_gym ? 1 : 0,
        onboarding.uses_abc ? 1 : 0,
        now,
        now
      );

      await db.runAsync(
        `INSERT OR IGNORE INTO step_tracking_state
           (id, is_tracking, is_paused, is_vehicle_mode, daily_goal, updated_at)
         VALUES (1,1,0,0,8000,?)`,
        ts
      );

      for (let i = 0; i < containers.length; i++) {
        const c = containers[i];
        await db.runAsync(
          `INSERT INTO water_containers
             (name, capacity_ml, sort_order, is_deleted, created_at, updated_at)
           VALUES (?,?,?,0,?,?)`,
          c.name.trim(), c.capacity_ml, i, ts, ts
        );
      }

      const saved = await db.getFirstAsync<any>(
        'SELECT * FROM user_profile WHERE id = 1'
      );
      if (saved) {
        setProfile({ ...saved, onboarding_complete: true, uses_gym: saved.uses_gym === 1, uses_abc: saved.uses_abc === 1 });
      }
    } catch (e) {
      console.error('[WaterContainersScreen]', e);
      showError('Error', 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <OnboardingLayout
      step={7}
      totalSteps={8}
      title="Your containers"
      subtitle="Tap a container on the home screen to instantly log water. Add more anytime."
      onBack={() => navigation.goBack()}
    >
      <View>
        <Text style={styles.sectionLabel}>Quick add</Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => {
            const added = containers.some((c) => c.name === p.name);
            return (
              <TouchableOpacity
                key={p.name}
                style={[styles.preset, added && styles.presetAdded]}
                onPress={() => addPreset(p)}
                disabled={added}
              >
                <Text style={[styles.presetText, added && { color: COLORS.water }]}>
                  {p.name}
                </Text>
                <Text style={[styles.presetMl, added && { color: COLORS.water }]}>
                  {p.capacity_ml} ml
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.list}>
        {containers.map((c, i) => (
          <View key={i} style={styles.containerRow}>
            <TextInput
              style={styles.nameInput}
              value={c.name}
              onChangeText={(v) => updateName(i, v)}
              placeholder="Container name"
            />
            <View style={styles.capacityRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => updateCapacity(i, -50)}>
                <Minus size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.capacityText}>{c.capacity_ml} ml</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => updateCapacity(i, 50)}>
                <Plus size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {containers.length > 1 && (
                <TouchableOpacity onPress={() => remove(i)} hitSlop={8}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      <Button
        label="All done — let's go!"
        onPress={handleFinish}
        isLoading={saving}
        accentColor={COLORS.water}
        size="lg"
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  preset: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
  },
  presetAdded: {
    borderColor: COLORS.water,
    backgroundColor: `${COLORS.water}18`,
  },
  presetText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  presetMl: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  list: { gap: SPACING.md },
  containerRow: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  nameInput: {
    borderWidth: 0,
    backgroundColor: COLORS.transparent,
    paddingHorizontal: 0,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  } as any,
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capacityText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    minWidth: 60,
    textAlign: 'center',
  },
  removeText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
});
