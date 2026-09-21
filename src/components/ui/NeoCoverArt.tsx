import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { cacheService } from '../../services/cacheService';

interface NeoCoverArtProps {
  url?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackIconSize?: number;
}

const FallbackArtworkIcon = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" fill="#FFE5EC" />
    <Circle cx="12" cy="12" r="3" fill="#000" />
    <Path d="M12 2a10 10 0 0 1 10 10" />
  </Svg>
);

export function NeoCoverArt({
  url,
  className = '',
  imageClassName = 'w-full h-full',
  fallbackIconSize = 36,
}: NeoCoverArtProps) {
  const [resolvedUri, setResolvedUri] = useState<string | undefined>(url || undefined);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (url) {
      cacheService.getOrCacheImage(url).then((cached) => {
        if (isMounted) {
          setResolvedUri(cached || url);
        }
      });
    } else {
      setResolvedUri(undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!resolvedUri || hasError) {
    return (
      <View className={`items-center justify-center bg-neo-muted border-4 border-black ${className}`}>
        <FallbackArtworkIcon size={fallbackIconSize} />
      </View>
    );
  }

  return (
    <View className={`relative overflow-hidden ${className}`}>
      <Image
        source={{ uri: resolvedUri }}
        className={imageClassName}
        onError={() => setHasError(true)}
      />
    </View>
  );
}
