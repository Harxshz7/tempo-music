import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NeoText } from './NeoText';

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
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 30],
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={twMerge(
        'w-16 h-8 border-4 border-black justify-center relative flex-row items-center px-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        value ? 'bg-neo-secondary' : 'bg-white',
        disabled && 'opacity-50',
        className
      )}
    >
      {/* State label on track */}
      <View className="absolute inset-0 flex-row items-center justify-between px-2">
        <NeoText variant="caption" className={clsx("font-black text-[10px]", value ? "opacity-100 text-black" : "opacity-0")}>
          ON
        </NeoText>
        <NeoText variant="caption" className={clsx("font-black text-[10px]", !value ? "opacity-40 text-black" : "opacity-0")}>
          OFF
        </NeoText>
      </View>

      {/* Sliding Knob */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className="w-5 h-5 border-2 border-black bg-black absolute left-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
      />
    </Pressable>
  );
}
