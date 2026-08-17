import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Dumbbell } from 'lucide-react-native';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'GymQuestion'>;

export function GymQuestionScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();

  function select(value: boolean) {
    update({ uses_gym: value });
    navigation.navigate('AbcQuestion');
  }

  return (
    <OnboardingLayout
      step={4}
      totalSteps={8}
      title={'Do you go\nto the gym?'}
      subtitle="Enables manual workout logging and calorie tracking for gym sessions."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.options}>
        <OptionCard
          label="Yes, I do"
          description="I'll log my workouts"
          active={data.uses_gym === true}
          onPress={() => select(true)}
          accentColor={COLORS.calories}
          icon={<Dumbbell size={28} color={data.uses_gym === true ? COLORS.calories : COLORS.textMuted} />}
        />
        <OptionCard
          label="No, I don't"
          description="Just track walking calories"
          active={data.uses_gym === false}
          onPress={() => select(false)}
          accentColor={COLORS.calories}
        />
      </View>
    </OnboardingLayout>
  );
}

function OptionCard({
  label,
  description,
  active,
  onPress,
  accentColor,
  icon,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
  accentColor: string;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, active && { borderColor: accentColor, backgroundColor: `${accentColor}15` }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardLabel, active && { color: accentColor }]}>{label}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <View style={[styles.radio, active && { borderColor: accentColor }]}>
        {active && <View style={[styles.radioDot, { backgroundColor: accentColor }]} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // Dark/transparent background
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
  },
});
