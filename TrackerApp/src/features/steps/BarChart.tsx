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
  topLabel?: string; // Date shown on top
  value: number;
  valueLabel?: string; // Value shown on/above bar
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
    <View style={[styles.container, { height: height + (compact ? 0 : 48) }]}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <Bar
            key={i}
            value={d.value}
            maxValue={maxValue}
            label={d.label}
            topLabel={d.topLabel}
            valueLabel={d.valueLabel}
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
  topLabel,
  valueLabel,
  accentColor,
  compact,
}: {
  value: number;
  maxValue: number;
  label: string;
  topLabel?: string;
  valueLabel?: string;
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
      {/* Top label (date) */}
      {topLabel && !compact && (
        <Text style={styles.topLabel} numberOfLines={1}>
          {topLabel}
        </Text>
      )}
      
      {/* Value label above bar */}
      {valueLabel && !compact && (
        <Text style={styles.valueLabel} numberOfLines={1}>
          {valueLabel}
        </Text>
      )}
      
      {/* Bar */}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: accentColor },
            barStyle,
          ]}
        />
      </View>
      
      {/* Bottom label (day name) */}
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
    gap: 2,
  },
  topLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
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
    marginTop: 2,
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
