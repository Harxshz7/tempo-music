import React from 'react';
import { View, Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HardShadow } from './HardShadow';
import { NeoText } from './NeoText';
import { cn } from './NeoText';

export interface NeoButtonProps extends PressableProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function NeoButton({ label, variant = 'primary', fullWidth, className, icon, children, ...props }: NeoButtonProps) {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withTiming(isPressed.value ? 2 : 0, { duration: 100 }) },
        { translateY: withTiming(isPressed.value ? 2 : 0, { duration: 100 }) }
      ]
    };
  });

  const getBgColor = () => {
    switch (variant) {
      case 'primary': return 'bg-neo-accent';
      case 'secondary': return 'bg-neo-secondary';
      case 'outline': return 'bg-neo-bg';
      case 'ghost': return 'bg-transparent border-0';
      default: return 'bg-neo-accent';
    }
  };

  const buttonContent = (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => isPressed.value = true}
        onPressOut={() => isPressed.value = false}
        className={cn(
          "px-6 py-3 border-4 border-black items-center justify-center flex-row active:bg-opacity-80 gap-2",
          getBgColor(),
          className
        )}
        {...props}
      >
        {icon}
        {label && <NeoText variant="h3">{label}</NeoText>}
        {children}
      </Pressable>
    </Animated.View>
  );

  if (variant === 'ghost') return buttonContent;

  return (
    <View className={fullWidth ? 'w-full' : 'self-start'}>
      <HardShadow>{buttonContent}</HardShadow>
    </View>
  );
}
