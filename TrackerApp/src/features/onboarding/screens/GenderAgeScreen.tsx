import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'GenderAge'>;

const GENDERS = [
  { key: 'male',   label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other',  label: 'Other' },
] as const;

export function GenderAgeScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();
  const [ageError, setAgeError] = useState('');

  function handleNext() {
    const age = parseInt(data.age, 10);
    if (!data.age || isNaN(age) || age < 10 || age > 100) {
      setAgeError('Enter a valid age (10–100)');
      return;
    }
    setAgeError('');
    navigation.navigate('HeightWeight');
  }

  return (
    <OnboardingLayout
      step={1}
      totalSteps={8}
      title={'Tell us a bit\nabout yourself'}
      subtitle="Used to personalise your health calculations."
      onBack={() => navigation.goBack()}
    >
      {/* Gender selector */}
      <View>
        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => {
            const active = data.gender === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.genderChip, active && styles.genderChipActive]}
                onPress={() => update({ gender: g.key })}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.genderText, active && styles.genderTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Age input */}
      <TextInput
        label="Age"
        placeholder="e.g. 25"
        value={data.age}
        onChangeText={(v) => { update({ age: v }); setAgeError(''); }}
        error={ageError}
        keyboardType="numeric"
        maxLength={3}
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      <Button
        label="Continue"
        onPress={handleNext}
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
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
  },
  genderChipActive: {
    borderColor: COLORS.water,
    backgroundColor: `${COLORS.water}22`,
  },
  genderText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  genderTextActive: {
    color: COLORS.water,
  },
});
