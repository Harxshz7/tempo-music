import React from 'react';
import { View, ViewProps } from 'react-native';
import { NeoText, cn } from './NeoText';

interface NeoBadgeProps extends ViewProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'muted';
  shape?: 'pill' | 'square';
  rotated?: boolean;
}

export function NeoBadge({ 
  label, 
  variant = 'primary', 
  shape = 'pill', 
  rotated = false,
  className, 
  ...props 
}: NeoBadgeProps) {
  const bgColor = {
    primary: 'bg-neo-accent',
    secondary: 'bg-neo-secondary',
    muted: 'bg-neo-muted',
  }[variant];

  const shapeClass = shape === 'pill' ? 'rounded-full px-3 py-1' : 'px-2 py-1';
  const rotation = rotated ? 'transform -rotate-6' : '';

  return (
    <View 
      className={cn(
        "border-2 border-black self-start items-center justify-center",
        bgColor,
        shapeClass,
        rotation,
        className
      )}
      {...props}
    >
      <NeoText variant="caption" className="font-bold uppercase tracking-widest">{label}</NeoText>
    </View>
  );
}
