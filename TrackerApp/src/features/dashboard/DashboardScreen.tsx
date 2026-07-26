import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';

export function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-5 pt-6">
        <Text className="mb-1 text-2xl font-bold text-slate-900">Dashboard</Text>
        <Text className="mb-6 text-sm text-slate-500">
          Your weekly health summary will appear here.
        </Text>

        <Card>
          <Text className="text-center text-slate-400">
            Charts and stats coming soon.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}
