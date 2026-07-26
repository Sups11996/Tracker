import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextInput } from '../../../components/ui';
import { useUsernameSetup } from '../hooks/useUsernameSetup';

export function UsernameSetupScreen() {
  const { username, setUsername, error, isLoading, submit } = useUsernameSetup();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-10">
            {/* Heading */}
            <View className="mb-10">
              <Text className="text-3xl font-bold text-slate-900">
                Welcome 👋
              </Text>
              <Text className="mt-2 text-base text-slate-500">
                Pick a unique username to get started. This is how you'll appear
                in the app.
              </Text>
            </View>

            {/* Input */}
            <View className="gap-y-6">
              <TextInput
                label="Username"
                placeholder="e.g. john_doe"
                value={username}
                onChangeText={setUsername}
                error={error ?? undefined}
                returnKeyType="done"
                onSubmitEditing={submit}
                maxLength={20}
                autoFocus
              />

              <Button
                label="Continue"
                onPress={submit}
                isLoading={isLoading}
                disabled={username.length < 3}
              />
            </View>

            {/* Fine print */}
            <Text className="mt-6 text-center text-xs text-slate-400">
              You can change your username later in Settings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
