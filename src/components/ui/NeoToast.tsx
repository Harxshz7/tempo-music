import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useToastStore } from '../../services/toast';

export function NeoToast() {
  const { message, type, hideToast } = useToastStore();

  if (!message) return null;

  const bgStyle = {
    error: 'bg-neo-accent',
    info: 'bg-neo-secondary',
    success: 'bg-neo-yellow',
  }[type];

  const textStyle = {
    error: 'text-white',
    info: 'text-black',
    success: 'text-black',
  }[type];

  return (
    <View 
      pointerEvents="box-none" 
      className="absolute top-12 left-4 right-4 z-[100] items-center justify-center"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        className={`px-4 py-3 border-2 border-neo-black shadow-neo flex-row items-center justify-between ${bgStyle}`}
      >
        <Text className={`font-space-bold text-sm flex-1 mr-2 ${textStyle}`}>
          {message}
        </Text>
        <Text className={`font-space-bold text-xs opacity-80 ${textStyle}`}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
