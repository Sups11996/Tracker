import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { useOnboardingStore, calcWaterGoal } from '../../../stores/onboardingStore';
import { COLORS, SPACING } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'HeightWeight'>;

/**
 * Convert ft.in format (e.g. 5.7 = 5 ft 7 in) to centimetres.
 * The decimal part is inches (0–11), NOT a fractional foot.
 */
function ftInToCm(ftIn: string): number {
  const parsed = parseFloat(ftIn);
  if (isNaN(parsed)) return NaN;
  const feet = Math.floor(parsed);
  const inches = Math.round((parsed - feet) * 10); // e.g. 5.7 → inches = 7
  if (inches > 11) return NaN;
  return Math.round(feet * 30.48 + inches * 2.54);
}

/**
 * Validate ft.in input: value like 4.0 – 7.11
 */
function isValidFtIn(ftIn: string): boolean {
  const cm = ftInToCm(ftIn);
  return !isNaN(cm) && cm >= 120 && cm <= 230;
}

export function HeightWeightScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();
  const [heightFtIn, setHeightFtIn] = useState(data.height_ft_in || '');
  const [heightError, setHeightError] = useState('');
  const [weightError, setWeightError] = useState('');

  function handleNext() {
    let valid = true;
    const w = parseFloat(data.weight_kg);

    if (!heightFtIn || !isValidFtIn(heightFtIn)) {
      setHeightError('Enter height as ft.in (e.g. 5.7 for 5\'7")');
      valid = false;
    } else {
      setHeightError('');
    }

    if (!data.weight_kg || isNaN(w) || w < 30 || w > 300) {
      setWeightError('Enter a valid weight (30–300 kg)');
      valid = false;
    } else {
      setWeightError('');
    }

    if (!valid) return;

    const cm = ftInToCm(heightFtIn);

    // Store both the display value and the converted cm
    update({ height_cm: String(cm), height_ft_in: heightFtIn });

    // Pre-calculate water goal before navigating
    const waterGoal = calcWaterGoal(w);
    update({ water_goal_ml: String(waterGoal) });
    navigation.navigate('WaterGoal');
  }

  return (
    <OnboardingLayout
      step={2}
      totalSteps={8}
      title={'Height &\nWeight'}
      subtitle="Enter height as ft.in (e.g. 5.7 = 5 ft 7 in). Weight in kg."
      onBack={() => navigation.goBack()}
    >
      <TextInput
        label="Height (ft.in)"
        placeholder="e.g. 5.7"
        value={heightFtIn}
        onChangeText={(v) => { setHeightFtIn(v); setHeightError(''); }}
        error={heightError}
        keyboardType="decimal-pad"
        maxLength={4}
        returnKeyType="next"
      />

      <TextInput
        label="Weight (kg)"
        placeholder="e.g. 70"
        value={data.weight_kg}
        onChangeText={(v) => { update({ weight_kg: v }); setWeightError(''); }}
        error={weightError}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleNext}
          accentColor={COLORS.water}
          size="lg"
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: SPACING.sm,
  },
});
