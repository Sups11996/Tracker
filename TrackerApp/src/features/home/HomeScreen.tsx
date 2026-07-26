import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';
import { useUserStore } from '../../stores';
import { COLORS } from '../../constants';

/** Placeholder tile for a future health feature */
function FeatureTile({
  emoji,
  label,
  color,
}: {
  emoji: string;
  label: string;
  color: string;
}) {
  return (
    <Card className="flex-1 items-center py-6">
      <Text style={{ fontSize: 32 }}>{emoji}</Text>
      <Text className="mt-2 text-sm font-semibold text-slate-600">{label}</Text>
      <View
        className="mt-2 rounded-full px-2 py-0.5"
        style={{ backgroundColor: color + '22' }}
      >
        <Text className="text-xs font-medium" style={{ color }}>
          Coming soon
        </Text>
      </View>
    </Card>
  );
}

export function HomeScreen() {
  const { profile } = useUserStore();

  const features = [
    { emoji: '🚶', label: 'Steps',       color: COLORS.steps },
    { emoji: '💧', label: 'Water',       color: COLORS.water },
    { emoji: '😴', label: 'Sleep',       color: COLORS.sleep },
    { emoji: '🔥', label: 'Calories',   color: COLORS.calories },
    { emoji: '📱', label: 'Screen Time', color: COLORS.screen },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View className="mb-2">
          <Text className="text-2xl font-bold text-slate-900">
            Good day{profile ? `, ${profile.username}` : ''} 👋
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Your health dashboard is being set up.
          </Text>
        </View>

        {/* Feature tiles grid */}
        <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Tracking features
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {features.map((f) => (
            <View key={f.label} className="w-[47%]">
              <FeatureTile {...f} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
