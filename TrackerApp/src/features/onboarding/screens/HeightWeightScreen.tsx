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

export function HeightWeightScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();
  const [heightError, setHeightError] = useState('');
  const [weightError, setWeightError] = useState('');

  function handleNext() {
    let valid = true;
    const h = parseFloat(data.height_cm);
    const w = parseFloat(data.weight_kg);

    if (!data.height_cm || isNaN(h) || h < 100 || h > 250) {
      setHeightError('Enter a valid height (100–250 cm)');
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

    // Pre-calculate water goal before navigating
    const waterGoal = calcWaterGoal(w);
    update({ water_goal_ml: String(waterGoal) });
    navigation.navigate('WaterGoal');
  }

  return (
    <OnboardingLayout
      step={2}
      totalSteps={8}
      title="Height &\nWeight"
      subtitle="Used to estimate steps distance, calories, and daily water goal."
      onBack={() => navigation.goBack()}
    >
      <TextInput
        label="Height (cm)"
        placeholder="e.g. 175"
        value={data.height_cm}
        onChangeText={(v) => { update({ height_cm: v }); setHeightError(''); }}
        error={heightError}
        keyboardType="numeric"
        maxLength={5}
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
