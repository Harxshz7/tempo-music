import React from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.impactAsync(style).catch(() => {});
    } catch {
      // Ignore if not supported
    }
  }
};
