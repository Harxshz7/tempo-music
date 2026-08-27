import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { cn } from './NeoText';

interface NeoInputProps extends TextInputProps {}

export function NeoInput({ className, onFocus, onBlur, ...props }: NeoInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full">
      <TextInput
        className={cn(
          "w-full border-4 border-black p-4 font-space-grotesk text-base text-neo-black placeholder:text-gray-500",
          isFocused ? "bg-neo-secondary" : "bg-neo-bg",
          className
        )}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}
