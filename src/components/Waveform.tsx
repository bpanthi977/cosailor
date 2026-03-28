import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type WaveformProps = {
  bars: Animated.Value[];
  color: string;
  height?: number;
  barWidth?: number;
};

export default function Waveform({ bars, color, height = 48, barWidth = 5 }: WaveformProps) {
  return (
    <View style={[styles.container, { height }]}>
      {bars.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              height,
              backgroundColor: color,
              transform: [{ scaleY: val }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    borderRadius: 3,
  },
});
