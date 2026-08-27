import React, { useRef } from 'react';
import { View, Image, Pressable, FlatList, SafeAreaView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

import { usePlayerStore, Track } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { NeoText, HardShadow, NeoCard } from '../components/ui';

const MechButton = ({ children, onPress, className, shadowClassName = "bg-black w-full h-full", hideBorder = false }: any) => {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withTiming(isPressed.value ? 2 : 0, { duration: 100, easing: Easing.linear }) },
        { translateY: withTiming(isPressed.value ? 2 : 0, { duration: 100, easing: Easing.linear }) }
      ],
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
      <Animated.View className={`absolute top-[4px] left-[4px] ${shadowClassName}`} style={shadowStyle} />
      <Animated.View style={animatedStyle}>
        <Pressable
          onPressIn={() => isPressed.value = true}
          onPressOut={() => isPressed.value = false}
          onPress={onPress}
          className={`items-center justify-center ${hideBorder ? '' : 'border-4 border-black'} ${className}`}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const HalftoneBackground = () => (
  <View className="absolute inset-0 opacity-10" pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="halftone" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="3" fill="#000" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halftone)" />
    </Svg>
  </View>
);

export default function PlayerScreen() {
  const navigation = useNavigation();
  const { currentTrack, isPlaying, positionMillis, durationMillis, queue, queueIndex, playNext, playPrevious, playTrack } = usePlayerStore();
  const { play, pause, seek } = useAudioPlayer();

  const progressPercent = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  const formatTime = (millis: number) => {
    if (isNaN(millis) || millis < 0) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleSeek = (e: any) => {
    if (durationMillis === 0) return;
    const { locationX, layout } = e.nativeEvent;
    const seekPercent = locationX / layout.width;
    seek(seekPercent * durationMillis);
  };

  if (!currentTrack) {
    return (
      <View className="flex-1 bg-neo-bg items-center justify-center">
        <NeoText>No track playing.</NeoText>
      </View>
    );
  }

  const upcomingQueue = queue.slice(queueIndex + 1);

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <HalftoneBackground />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable 
            onPress={() => navigation.goBack()}
            className="w-12 h-12 items-center justify-center rounded-full"
        >
          <ChevronDown size={32} color="black" />
        </Pressable>
        <NeoText variant="caption" className="font-bold uppercase tracking-widest text-center flex-1 ml-[-48px]">
          Now Playing
        </NeoText>
      </View>

      {/* Album Art */}
      <View className="items-center mt-4">
        <View className="w-[80%] aspect-square relative -rotate-1">
          {/* Shadow */}
          <View className="absolute top-[12px] left-[12px] right-[-12px] bottom-[-12px] bg-black" />
          <Image 
            source={currentTrack.coverArtUrl ? { uri: currentTrack.coverArtUrl } : require('../../assets/icon.png')} 
            className="w-full h-full bg-neo-muted border-4 border-black"
          />
          {/* Badge */}
          <View className="absolute -top-3 -right-3 bg-neo-secondary border-2 border-black rotate-3 px-2 py-1">
            <NeoText variant="caption" className="font-black uppercase text-xs">
              FLAC
            </NeoText>
          </View>
        </View>
      </View>

      {/* Track Info */}
      <View className="px-8 mt-12 w-full">
        <NeoText variant="h2" numberOfLines={1} ellipsizeMode="tail" className="font-black tracking-tight text-3xl">
          {currentTrack.title}
        </NeoText>
        <NeoText variant="body" numberOfLines={1} ellipsizeMode="tail" className="font-bold uppercase text-base opacity-70 mt-1">
          {currentTrack.artist}
        </NeoText>
      </View>

      {/* Scrubber */}
      <View className="px-8 mt-8">
        <Pressable onPress={handleSeek} className="h-3 bg-white border-4 border-black w-full relative">
          <View 
            className="absolute top-0 left-0 bottom-0 bg-neo-secondary border-r-4 border-black" 
            style={{ width: `${progressPercent}%` }} 
          />
        </Pressable>
        <View className="flex-row justify-between mt-3">
          <NeoText variant="caption" className="font-bold text-sm">{formatTime(positionMillis)}</NeoText>
          <NeoText variant="caption" className="font-bold text-sm">-{formatTime(durationMillis - positionMillis)}</NeoText>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center gap-4 mt-6 px-4">
        <MechButton onPress={() => {}} className="w-12 h-12 bg-transparent" shadowClassName="hidden" hideBorder>
          <Shuffle size={24} color="black" />
        </MechButton>
        
        <MechButton onPress={playPrevious} className="w-14 h-14 bg-neo-bg">
          <SkipBack size={24} color="black" fill="black" />
        </MechButton>
        
        <MechButton onPress={handlePlayPause} className="w-[72px] h-[72px] bg-neo-accent">
          {isPlaying ? <Pause size={32} color="black" fill="black" /> : <Play size={32} color="black" fill="black" />}
        </MechButton>
        
        <MechButton onPress={playNext} className="w-14 h-14 bg-neo-bg">
          <SkipForward size={24} color="black" fill="black" />
        </MechButton>
        
        <MechButton onPress={() => {}} className="w-12 h-12 bg-transparent" shadowClassName="hidden" hideBorder>
          <Repeat size={24} color="black" />
        </MechButton>
      </View>

      {/* Queue */}
      <View className="flex-1 mt-8 bg-white border-t-4 border-black px-6 pt-6">
        <View className="border-b-4 border-black pb-2 mb-4 self-start">
          <NeoText variant="caption" className="font-black uppercase tracking-widest">Up Next</NeoText>
        </View>
        <FlatList
          data={upcomingQueue}
          keyExtractor={(item, index) => item.id + '-' + index}
          renderItem={({ item }) => (
            <Pressable onPress={() => playTrack(item)}>
                <NeoCard noShadow className="flex-row items-center p-2 mb-3 bg-neo-bg border-4 border-black">
                <Image 
                    source={item.coverArtUrl ? { uri: item.coverArtUrl } : require('../../assets/icon.png')} 
                    className="w-11 h-11 border-4 border-black bg-neo-muted"
                />
                <View className="flex-1 ml-4 justify-center">
                    <NeoText variant="body" numberOfLines={1} className="font-bold text-sm leading-tight uppercase tracking-tight">
                    {item.title}
                    </NeoText>
                    <NeoText variant="caption" numberOfLines={1} className="text-xs opacity-70 font-bold uppercase tracking-wider mt-0.5">
                    {item.artist}
                    </NeoText>
                </View>
                </NeoCard>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
