import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useToastStore } from '../../services/toast';

export function NeoToast() {
  const { message, type, hideToast } = useToastStore();

  if (!message) return null;

  const bgStyles = {
    error: 'bg-neo-accent text-white',
    info: 'bg-neo-secondary text-black',
    success: 'bg-neo-yellow text-black',
  }[type];

  return (
    <View 
      pointerEvents="box-none" 
      className="absolute top-12 left-4 right-4 z-[100] items-center justify-center"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        className={`px-4 py-3 rounded-none border-2 border-neo-black shadow-neo-sm flex-row items-center justify-between ${bgStyles}`}
      >
        <Text className="font-space-bold text-sm text-black flex-1 mr-2">
          {message}
        </Text>
        <Text className="font-space-bold text-xs text-black opacity-60">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
