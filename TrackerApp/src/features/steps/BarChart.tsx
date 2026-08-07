import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface BarData {
  label: string;
  topLabel?: string;
  value: number;
  valueLabel?: string;
  goalMet?: boolean;
}

interface BarChartProps {
  data: BarData[];
  maxValue: number;
  accentColor?: string;
  compact?: boolean;
  height?: number;
  selectedIndex?: number;
  onBarPress?: (index: number) => void;
}

export function BarChart({
  data,
  maxValue,
  accentColor = COLORS.steps,
  compact = false,
  height = 120,
  selectedIndex,
  onBarPress,
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
            key={`bar-${i}`}
            index={i}
            value={d.value}
            maxValue={maxValue}
            label={d.label}
            topLabel={d.topLabel}
            valueLabel={d.valueLabel}
            normalColor={d.goalMet ? accentColor : `${accentColor}70`}
            compact={compact}
            isSelected={selectedIndex === i}
            onPress={onBarPress}
          />
        ))}
      </View>
    </View>
  );
}

function Bar({
  index,
  value,
  maxValue,
  label,
  topLabel,
  valueLabel,
  normalColor,
  compact,
  isSelected,
  onPress,
}: {
  index: number;
  value: number;
  maxValue: number;
  label: string;
  topLabel?: string;
  valueLabel?: string;
  normalColor: string;
  compact: boolean;
  isSelected?: boolean;
  onPress?: (index: number) => void;
}) {
  const ratio = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;

  // Height — spring animation feels natural for bars growing up
  const heightAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: ratio,
      friction: 7,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Fill overlay — animates from 0% to 100% height on select
  // Looks like the darker color is filling in from bottom
  const fillAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 350,
      easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  const overlayHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity
      style={styles.barWrapper}
      onPress={() => onPress?.(index)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {topLabel && !compact && (
        <Text style={[styles.topLabel, isSelected && styles.topLabelSelected]} numberOfLines={1}>
          {topLabel}
        </Text>
      )}

      {valueLabel && !compact && (
        <Text style={[styles.valueLabel, isSelected && styles.valueLabelSelected]} numberOfLines={1}>
          {valueLabel}
        </Text>
      )}

      <View style={styles.barTrack}>
        {/* Sized container — matches actual bar height */}
        <Animated.View style={[styles.barFill, { height: animatedHeight }]}>
          {/* Base color */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: normalColor }]} />
          {/* Light overlay fills from bottom on select */}
          <Animated.View
            style={[
              styles.barOverlay,
              { backgroundColor: lighten(normalColor), height: overlayHeight },
            ]}
          />
        </Animated.View>
      </View>

      {!compact && (
        <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function lighten(color: string): string {
  const hex = color.replace('#', '');
  if (hex.length === 6 || hex.length === 8) {
    const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 60);
    const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 60);
    const alpha = hex.length === 8 ? hex.slice(6, 8) : '';
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alpha}`;
  }
  return color;
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
  topLabelSelected: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  valueLabelSelected: {
    color: COLORS.textPrimary,
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
    overflow: 'hidden',
  },
  barOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  barLabelSelected: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.bold,
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
