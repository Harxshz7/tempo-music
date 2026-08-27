import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { cn } from './NeoText';

interface NeoInputProps extends TextInputProps {
  rightIcon?: React.ReactNode;
}

export function NeoInput({ className, onFocus, onBlur, rightIcon, ...props }: NeoInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full relative">
      <TextInput
        className={cn(
          "w-full border-4 border-black p-4 font-space-grotesk text-base text-neo-black placeholder:text-gray-500",
          rightIcon ? "pr-12" : "",
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
      {rightIcon && (
        <View className="absolute right-4 top-0 bottom-0 justify-center">
          {rightIcon}
        </View>
      )}
    </View>
  );
}
