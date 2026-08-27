import React from 'react';
import { Text, TextProps } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeoTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
}

export function NeoText({ variant = 'body', className, style, ...props }: NeoTextProps) {
  const baseClasses = "text-neo-black";
  const variantClasses = {
    h1: "text-4xl font-space-grotesk-black uppercase tracking-wider",
    h2: "text-2xl font-space-grotesk-black uppercase tracking-wide",
    h3: "text-xl font-space-grotesk font-bold",
    body: "text-base font-space-grotesk font-medium",
    caption: "text-sm font-space-grotesk",
  };

  return (
    <Text 
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      {...props} 
    />
  );
}
