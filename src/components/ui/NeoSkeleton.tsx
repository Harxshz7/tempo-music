import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, ViewProps, AccessibilityInfo } from 'react-native';

export interface NeoSkeletonProps extends ViewProps {
  className?: string;
}

export function NeoSkeleton({ className, style, ...props }: NeoSkeletonProps) {
  const anim = useRef(new Animated.Value(0.4)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotion(enabled);
    }).catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(0.7);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [anim, reduceMotion]);

  return (
    <Animated.View
      style={[{ opacity: anim }, style]}
      className={`bg-neo-muted w-full h-full ${className || ''}`}
      {...props}
    />
  );
}
