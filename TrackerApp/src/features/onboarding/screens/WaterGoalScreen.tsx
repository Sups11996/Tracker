import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'WaterGoal'>;

export function WaterGoalScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();

  const goalMl = parseInt(data.water_goal_ml, 10) || 0;
  const goalL = (goalMl / 1000).toFixed(1);

  function handleNext() {
    const val = parseInt(data.water_goal_ml, 10);
    if (!val || val < 500 || val > 6000) {
      update({ water_goal_ml: '2400' });
    }
    navigation.navigate('GymQuestion');
  }

  return (
    <OnboardingLayout
      step={3}
      totalSteps={8}
      title={'Your water\ngoal'}
      subtitle="Calculated from your weight. You can change this anytime in Settings."
      onBack={() => navigation.goBack()}
    >
      {/* Calculated display */}
      <View style={styles.highlight}>
        <Text style={styles.highlightValue}>{goalL} L</Text>
        <Text style={styles.highlightSub}>per day · {goalMl} ml</Text>
      </View>

      {/* Editable override */}
      <TextInput
        label="Edit goal (ml)"
        placeholder={String(goalMl)}
        value={data.water_goal_ml}
        onChangeText={(v) => update({ water_goal_ml: v })}
        keyboardType="numeric"
        maxLength={4}
        hint="Min 500 ml · Max 6000 ml"
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      <Button
        label="Looks good"
        onPress={handleNext}
        accentColor={COLORS.water}
        size="lg"
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: `${COLORS.water}18`,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${COLORS.water}40`,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  highlightValue: {
    fontSize: TYPOGRAPHY.size.huge,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.water,
  },
  highlightSub: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
