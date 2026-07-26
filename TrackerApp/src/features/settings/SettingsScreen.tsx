import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User } from 'lucide-react-native';
import { Card } from '../../components/ui';
import { useAuthStore, useUserStore } from '../../stores';
import { COLORS } from '../../constants';

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-x-4 py-3"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${destructive ? 'text-red-500' : 'text-slate-800'}`}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="text-xs text-slate-400">{sublabel}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const { signOut } = useAuthStore();
  const { profile, clearProfile } = useUserStore();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          clearProfile();
          await signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-5 pt-6">
        <Text className="mb-6 text-2xl font-bold text-slate-900">Settings</Text>

        {/* Account section */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Account
        </Text>
        <Card className="mb-4">
          <SettingsRow
            icon={<User size={20} color={COLORS.primary} />}
            label={profile?.username ?? '—'}
            sublabel="Your username"
          />
        </Card>

        {/* Danger zone */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Session
        </Text>
        <Card>
          <SettingsRow
            icon={<LogOut size={20} color="#EF4444" />}
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}
