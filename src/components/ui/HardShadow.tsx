import React from 'react';
import { View, Platform, ViewProps } from 'react-native';
import { Shadow } from 'react-native-shadow-2';

export function HardShadow({ children, style }: ViewProps) {
  if (Platform.OS === 'web') {
    return <View className="shadow-[4px_4px_0px_0px_#000]" style={style}>{children}</View>;
  }
  
  return (
    <Shadow distance={4} startColor="#000" offset={[4, 4]} style={style} paintInside={false}>
      {children}
    </Shadow>
  );
}
