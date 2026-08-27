import React from 'react';
import { View, ViewProps } from 'react-native';
import { HardShadow } from './HardShadow';
import { cn } from './NeoText';

interface NeoCardProps extends ViewProps {
  noShadow?: boolean;
}

export function NeoCard({ children, className, noShadow = false, ...props }: NeoCardProps) {
  const content = (
    <View 
      className={cn("bg-neo-bg border-4 border-black p-4", className)} 
      {...props}
    >
      {children}
    </View>
  );

  if (noShadow) return content;

  return (
    <HardShadow>
      {content}
    </HardShadow>
  );
}
