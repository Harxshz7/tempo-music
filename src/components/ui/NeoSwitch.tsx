import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface NeoSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function NeoSwitch({ value, onValueChange, disabled = false, className }: NeoSwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 24],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#ffb5a7'], // Using a standard neo-secondary hex or white. 
    // Wait, let's keep it simple. It might be better to just swap classes or use a direct color.
    // If we use #ffb5a7, it may not match neo-secondary.
  });
  
  // It's better to just use tailwind classes for background and animated transform for the knob.
  // Actually, animating background color with native driver false is okay, but using state/tailwind is also fine.
  
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={twMerge(
        'w-14 h-8 rounded-full border-4 border-black justify-center relative overflow-visible',
        value ? 'bg-neo-secondary' : 'bg-white',
        disabled && 'opacity-50',
        className
      )}
    >
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className="w-4 h-4 rounded-full bg-black absolute left-0"
      />
    </Pressable>
  );
}
