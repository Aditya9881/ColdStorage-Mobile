/**
 * GlassCard — Frosted glass card for use over gradient backgrounds
 *
 * Uses expo-blur BlurView + semi-transparent white overlay.
 * Perfect for hero stat cards on gradient headers.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BorderRadius } from '@/constants/Colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark';
}

export default function GlassCard({ children, style, intensity = 40, tint = 'light' }: GlassCardProps) {
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, style]}>
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  // Android fallback — semi-transparent bg
  return (
    <View style={[styles.container, styles.androidFallback, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  content: {
    padding: 16,
  },
  androidFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
