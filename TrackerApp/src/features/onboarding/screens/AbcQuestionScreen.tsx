import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'AbcQuestion'>;

export function AbcQuestionScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();

  function select(value: boolean) {
    update({ uses_abc: value });
    navigation.navigate('Permissions');
  }

  return (
    <OnboardingLayout
      step={5}
      totalSteps={8}
      title={'Do you use\nABC?'}
      subtitle="Enables a private daily count tracker. Only visible to you."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.options}>
        <OptionChip
          label="Yes"
          active={data.uses_abc === true}
          onPress={() => select(true)}
          accentColor={COLORS.abc}
        />
        <OptionChip
          label="No"
          active={data.uses_abc === false}
          onPress={() => select(false)}
          accentColor={COLORS.abc}
        />
      </View>
    </OnboardingLayout>
  );
}

function OptionChip({
  label,
  active,
  onPress,
  accentColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { borderColor: accentColor, backgroundColor: `${accentColor}15` },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      <Text style={[styles.chipLabel, active && { color: accentColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
  },
});
