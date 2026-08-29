import React, { useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { NeoText } from './ui/NeoText';
import { useNavigation } from '@react-navigation/native';

// Animated Pressable for mechanical button feel
const MechButton = ({ children, onPress, className, iconColor = "#000" }: any) => {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withTiming(isPressed.value ? 2 : 0, { duration: 100, easing: Easing.linear }) },
        { translateY: withTiming(isPressed.value ? 2 : 0, { duration: 100, easing: Easing.linear }) }
      ],
      // simulate shadow removal by translating over it
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withTiming(isPressed.value ? -2 : 0, { duration: 100, easing: Easing.linear }) },
        { translateY: withTiming(isPressed.value ? -2 : 0, { duration: 100, easing: Easing.linear }) }
      ],
      opacity: withTiming(isPressed.value ? 0 : 1, { duration: 100 })
    };
  });

  return (
    <View className="relative">
      <Animated.View className={`absolute top-[3px] left-[3px] bg-black ${className}`} style={shadowStyle} />
      <Animated.View style={animatedStyle}>
        <Pressable
          onPressIn={() => isPressed.value = true}
          onPressOut={() => isPressed.value = false}
          onPress={onPress}
          className={`items-center justify-center border-[3px] border-black ${className}`}
        >
          {React.cloneElement(children, { color: iconColor })}
        </Pressable>
      </Animated.View>
    </View>
  );
};

export function NeoPlayerBar() {
  const navigation = useNavigation<any>();
  const [trackWidth, setTrackWidth] = useState(0);
  const { currentTrack, isPlaying, positionMillis, durationMillis, playNext, playPrevious } = usePlayerStore();
  const { play, pause, seek } = useAudioPlayer();

  if (!currentTrack) return null;

  const validDuration = durationMillis > 0 && isFinite(durationMillis) ? durationMillis : (currentTrack.duration ? currentTrack.duration * 1000 : 0);
  const validPosition = positionMillis > 0 && isFinite(positionMillis) ? positionMillis : 0;
  const progressPercent = validDuration > 0 ? Math.min(100, Math.max(0, (validPosition / validDuration) * 100)) : 0;

  const handleSeek = (e: any) => {
    if (validDuration <= 0 || trackWidth <= 0) return;
    const locationX = e.nativeEvent.locationX ?? e.nativeEvent.offsetX ?? 0;
    const seekPercent = Math.max(0, Math.min(1, locationX / trackWidth));
    seek(seekPercent * validDuration);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <View className="bg-neo-accent border-t-4 border-black w-full">
      {/* Progress Track */}
      <Pressable 
        onPress={handleSeek} 
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        className="h-2 bg-white border-b-2 border-black w-full relative"
      >
        <View 
          className="absolute top-0 left-0 bottom-0 bg-neo-secondary border-r-2 border-black" 
          style={{ width: `${progressPercent}%` }} 
        />
      </Pressable>

      {/* Main Row */}
      <View className="flex-row items-center px-[12px] py-[10px] gap-[10px]">
        {/* Album Art */}
        <Pressable onPress={() => navigation.navigate('Player')} className="relative">
           {/* Static Shadow */}
           <View className="absolute top-[3px] left-[3px] w-[52px] h-[52px] bg-black -rotate-2" />
           <Image 
             source={currentTrack.coverArtUrl ? { uri: currentTrack.coverArtUrl } : require('../../assets/icon.png')} 
             className="w-[52px] h-[52px] bg-neo-muted border-[3px] border-black -rotate-2"
           />
        </Pressable>

        {/* Meta Column */}
        <Pressable onPress={() => navigation.navigate('Player')} className="flex-1 justify-center ml-2">
          <NeoText variant="body" numberOfLines={1} ellipsizeMode="tail" className="font-space-grotesk-black uppercase text-[15px] leading-tight">
            {currentTrack.title}
          </NeoText>
          <NeoText variant="caption" numberOfLines={1} ellipsizeMode="tail" className="font-bold uppercase text-[11px] opacity-75 tracking-widest mt-0.5">
            {currentTrack.artist}
          </NeoText>
        </Pressable>

        {/* Controls Row */}
        <View className="flex-row items-center gap-3">
          <MechButton onPress={playPrevious} className="w-[38px] h-[38px] bg-white">
            <SkipBack size={18} fill="black" />
          </MechButton>
          
          <MechButton onPress={handlePlayPause} className="w-[44px] h-[44px] bg-neo-secondary">
            {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" />}
          </MechButton>
          
          <MechButton onPress={playNext} className="w-[38px] h-[38px] bg-white">
            <SkipForward size={18} fill="black" />
          </MechButton>
        </View>
      </View>
    </View>
  );
}
