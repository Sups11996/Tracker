import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface BarData {
  label: string;
  value: number;
  goalMet?: boolean;
}

interface BarChartProps {
  data: BarData[];
  maxValue: number;
  accentColor?: string;
  /** Compact mode: smaller bars, no labels below */
  compact?: boolean;
  height?: number;
}

export function BarChart({
  data,
  maxValue,
  accentColor = COLORS.steps,
  compact = false,
  height = 120,
}: BarChartProps) {
  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: height + (compact ? 0 : 24) }]}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <Bar
            key={i}
            value={d.value}
            maxValue={maxValue}
            label={d.label}
            accentColor={d.goalMet ? accentColor : `${accentColor}70`}
            compact={compact}
          />
        ))}
      </View>
    </View>
  );
}

function Bar({
  value,
  maxValue,
  label,
  accentColor,
  compact,
}: {
  value: number;
  maxValue: number;
  label: string;
  accentColor: string;
  compact: boolean;
}) {
  const ratio = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
  const animatedHeight = useSharedValue(0);

  React.useEffect(() => {
    animatedHeight.value = withTiming(ratio, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio]);

  const barStyle = useAnimatedStyle(() => ({
    height: `${animatedHeight.value * 100}%` as any,
  }));

  return (
    <View style={styles.barWrapper}>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: accentColor },
            barStyle,
          ]}
        />
      </View>
      {!compact && (
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    gap: SPACING.xs,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: RADIUS.sm,
    minHeight: 3,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
});
