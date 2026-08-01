import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { TextInput } from '../../../components/ui/TextInput';
import { Button } from '../../../components/ui/Button';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { COLORS, SPACING } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { data, update } = useOnboardingStore();
  const [error, setError] = useState('');

  function handleNext() {
    const trimmed = data.username.trim();
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters');
      return;
    }
    if (trimmed.length > 24) {
      setError('Max 24 characters');
      return;
    }
    update({ username: trimmed });
    setError('');
    navigation.navigate('GenderAge');
  }

  return (
    <OnboardingLayout
      step={0}
      totalSteps={8}
      title={'Hey there\nWhat should we\ncall you?'}
      subtitle="This is just for display. No account needed."
      hideBack
    >
      <TextInput
        label="Username"
        placeholder="e.g. Alex"
        value={data.username}
        onChangeText={(v) => { update({ username: v }); setError(''); }}
        error={error}
        maxLength={24}
        autoFocus
        returnKeyType="next"
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
    marginTop: SPACING.lg,
  },
});
