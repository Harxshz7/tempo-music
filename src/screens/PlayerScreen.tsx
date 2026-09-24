import React, { useState, useRef } from 'react';
import { View, Pressable, FlatList, SafeAreaView, ScrollView, PanResponder, Alert } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Trash2, ArrowUp, ArrowDown, Star, Plus, HardDriveDownload } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoCard, NeoCoverArt } from '../components/ui';
import { AddToPlaylistModal } from '../components';
import { triggerHaptic } from '../utils/haptics';
import { coverArtUrlFor } from '../utils';
import { useStarredStore } from '../store/starredStore';
import { offlineService } from '../services/offlineService';

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
          onPress={() => {
            triggerHaptic();
            onPress?.();
          }}
          className={`items-center justify-center min-w-[44px] min-h-[44px] ${hideBorder ? '' : 'border-4 border-black'} ${className}`}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
  const [trackWidth, setTrackWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionMillis, setScrubPositionMillis] = useState<number | null>(null);

  const [isAddToPlaylistVisible, setIsAddToPlaylistVisible] = useState(false);

  const { isWide } = useResponsive();
  const {
    currentTrack,
    isPlaying,
    positionMillis,
    durationMillis,
    queue,
    queueIndex,
    shuffle,
    repeat,
    playNext,
    playPrevious,
    playTrack,
    toggleShuffle,
    toggleRepeat,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayerStore();

  const { play, pause, seek } = useAudioPlayer();

  const isStarred = useStarredStore((state) => currentTrack ? state.isSongStarred(currentTrack.id) : false);
  const toggleStarSong = useStarredStore((state) => state.toggleStarSong);

  const validDuration = durationMillis > 0 && isFinite(durationMillis) 
    ? durationMillis 
    : (currentTrack?.duration ? currentTrack.duration * 1000 : 0);

  const effectivePosition = isScrubbing && scrubPositionMillis !== null
    ? scrubPositionMillis
    : (positionMillis > 0 && isFinite(positionMillis) ? positionMillis : 0);

  const progressPercent = validDuration > 0 
    ? Math.min(100, Math.max(0, (effectivePosition / validDuration) * 100)) 
    : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        updateScrubPosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateScrubPosition(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: (evt) => {
        setIsScrubbing(false);
        if (validDuration > 0 && trackWidth > 0) {
          const locationX = Math.max(0, Math.min(evt.nativeEvent.locationX, trackWidth));
          const seekPercent = locationX / trackWidth;
          const targetMillis = seekPercent * validDuration;
          seek(targetMillis);
        }
        setScrubPositionMillis(null);
      },
    })
  ).current;

  const updateScrubPosition = (locationX: number) => {
    if (validDuration <= 0 || trackWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(locationX, trackWidth));
    const seekPercent = clampedX / trackWidth;
    setScrubPositionMillis(seekPercent * validDuration);
  };

  const formatTime = (millis: number) => {
    if (isNaN(millis) || !isFinite(millis) || millis < 0) return '0:00';
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

  const handleToggleStar = () => {
    if (!currentTrack) return;
    toggleStarSong(currentTrack.id, isStarred);
  };

  if (!currentTrack) {
    return (
      <View className="flex-1 bg-neo-bg items-center justify-center">
        <NeoText>No track playing.</NeoText>
      </View>
    );
  }

  const upcomingQueue = queue.slice(queueIndex + 1);

  const renderScrubber = () => (
    <View className="w-full">
      <View 
        {...panResponder.panHandlers}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        className="h-4 bg-white border-4 border-black w-full relative justify-center"
      >
        <View 
          className="absolute top-0 left-0 bottom-0 bg-neo-secondary border-r-4 border-black" 
          style={{ width: `${progressPercent}%` }} 
        />
        {/* Scrubber Knob */}
        <View 
          className="absolute w-4 h-6 bg-neo-black border-2 border-white rounded-none -ml-2"
          style={{ left: `${progressPercent}%` }}
        />
      </View>
      <View className="flex-row justify-between mt-3">
        <NeoText variant="caption" className="font-bold text-sm">
          {formatTime(effectivePosition)}
        </NeoText>
        <NeoText variant="caption" className="font-bold text-sm">
          -{formatTime(Math.max(0, validDuration - effectivePosition))}
        </NeoText>
      </View>
    </View>
  );

  const renderControls = () => (
    <View className="flex-row items-center justify-center gap-4 mt-6">
      <MechButton 
        onPress={toggleShuffle} 
        className={`w-12 h-12 ${shuffle ? 'bg-neo-secondary' : 'bg-neo-bg'}`}
      >
        <Shuffle size={20} color="black" />
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
      
      <MechButton 
        onPress={toggleRepeat} 
        className={`w-12 h-12 relative ${repeat !== 'off' ? 'bg-neo-yellow' : 'bg-neo-bg'}`}
      >
        <Repeat size={20} color="black" />
        {repeat === 'one' && (
          <View className="absolute top-1 right-1 bg-black px-1 rounded-full">
            <NeoText className="text-[9px] text-white font-bold">1</NeoText>
          </View>
        )}
      </MechButton>
    </View>
  );

  const renderQueueList = () => (
    <View className="flex-1">
      <View className="flex-row items-center justify-between border-b-4 border-black pb-2 mb-4">
        <NeoText variant="caption" className="font-black uppercase tracking-widest text-sm">
          Up Next ({upcomingQueue.length})
        </NeoText>
        {queue.length > 0 && (
          <Pressable 
            onPress={() => {
              triggerHaptic();
              clearQueue();
            }}
            className="px-2 py-1 bg-neo-accent border-2 border-black flex-row items-center gap-1"
          >
            <Trash2 size={12} color="white" />
            <NeoText className="font-bold text-xs text-white uppercase">Clear</NeoText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={upcomingQueue}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={({ item, index }) => {
          const absoluteIndex = queueIndex + 1 + index;
          return (
            <NeoCard noShadow className="flex-row items-center p-2 mb-3 bg-neo-bg border-4 border-black">
              <Pressable onPress={() => playTrack(item, absoluteIndex)} className="flex-row items-center flex-1 mr-2">
                <NeoCoverArt 
                  url={coverArtUrlFor(item.coverArtId)}
                  className="w-11 h-11 border-2 border-black"
                  fallbackIconSize={20}
                />
                <View className="flex-1 ml-3 justify-center">
                  <NeoText variant="body" numberOfLines={1} className="font-bold text-sm leading-tight uppercase tracking-tight">
                    {item.title}
                  </NeoText>
                  <NeoText variant="caption" numberOfLines={1} className="text-xs opacity-70 font-bold uppercase tracking-wider mt-0.5">
                    {item.artist}
                  </NeoText>
                </View>
              </Pressable>

              {/* Action Controls */}
              <View className="flex-row items-center gap-1">
                {index > 0 && (
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      reorderQueue(absoluteIndex, absoluteIndex - 1);
                    }}
                    className="p-1 border border-black bg-white"
                  >
                    <ArrowUp size={14} color="black" />
                  </Pressable>
                )}
                {index < upcomingQueue.length - 1 && (
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      reorderQueue(absoluteIndex, absoluteIndex + 1);
                    }}
                    className="p-1 border border-black bg-white"
                  >
                    <ArrowDown size={14} color="black" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    removeFromQueue(absoluteIndex);
                  }}
                  className="p-1 border border-black bg-neo-accent ml-1"
                >
                  <Trash2 size={14} color="white" />
                </Pressable>
              </View>
            </NeoCard>
          );
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-8 items-center">
            <NeoText variant="caption" className="font-bold uppercase opacity-50">Queue is empty</NeoText>
          </View>
        }
      />
    </View>
  );

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
        <NeoText variant="caption" className="font-bold uppercase tracking-widest text-center flex-1">
          Now Playing
        </NeoText>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleToggleStar}
            className="w-10 h-10 items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-60"
          >
            <Star color="black" size={20} fill={isStarred ? '#FFD93D' : 'transparent'} />
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic();
              setIsAddToPlaylistVisible(true);
            }}
            className="w-10 h-10 items-center justify-center border-2 border-black bg-neo-secondary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-60"
          >
            <Plus color="black" size={20} />
          </Pressable>
        </View>
      </View>

      {isWide ? (
        /* Desktop / Wide 2-Column Layout */
        <View className="flex-1 flex-row px-8 pb-8 gap-8 max-w-6xl w-full mx-auto">
          {/* Left Column: Art + Info + Scrubber + Controls */}
          <View className="w-[48%] bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] items-center justify-between">
            <View className="w-64 h-64 border-4 border-black -rotate-1 relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-neo-muted">
              <NeoCoverArt 
                url={coverArtUrlFor(currentTrack.coverArtId)}
                className="w-full h-full"
                fallbackIconSize={64}
              />
              <View className="absolute -top-3 -right-3 bg-neo-secondary border-2 border-black rotate-3 px-2 py-1">
                <NeoText variant="caption" className="font-black uppercase text-xs">
                  FLAC
                </NeoText>
              </View>
            </View>

            <View className="w-full items-center my-4">
              <NeoText variant="h2" numberOfLines={1} ellipsizeMode="tail" className="font-black tracking-tight text-3xl uppercase text-center">
                {currentTrack.title}
              </NeoText>
              <NeoText variant="body" numberOfLines={1} ellipsizeMode="tail" className="font-bold uppercase text-base opacity-70 text-center mt-1">
                {currentTrack.artist}
              </NeoText>
            </View>

            <View className="w-full">
              {renderScrubber()}
              {renderControls()}
            </View>
          </View>

          {/* Right Column: Up Next Queue */}
          <View className="flex-1 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {renderQueueList()}
          </View>
        </View>
      ) : (
        /* Mobile Stacked Layout */
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Album Art */}
          <View className="items-center mt-4">
            <View className="w-[80%] max-w-[320px] aspect-square relative -rotate-1">
              <View className="absolute top-[12px] left-[12px] right-[-12px] bottom-[-12px] bg-black" />
              <NeoCoverArt 
                url={coverArtUrlFor(currentTrack.coverArtId)}
                className="w-full h-full border-4 border-black"
                fallbackIconSize={80}
              />
              <View className="absolute -top-3 -right-3 bg-neo-secondary border-2 border-black rotate-3 px-2 py-1">
                <NeoText variant="caption" className="font-black uppercase text-xs">
                  FLAC
                </NeoText>
              </View>
            </View>
          </View>

          {/* Track Info */}
          <View className="px-8 mt-10 w-full flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <NeoText variant="h2" numberOfLines={1} ellipsizeMode="tail" className="font-black tracking-tight text-3xl">
                {currentTrack.title}
              </NeoText>
              <NeoText variant="body" numberOfLines={1} ellipsizeMode="tail" className="font-bold uppercase text-base opacity-70 mt-1">
                {currentTrack.artist}
              </NeoText>
            </View>
            <Pressable
              onPress={handleToggleStar}
              className="w-12 h-12 border-2 border-black bg-white items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-60"
            >
              <Star color="black" size={24} fill={isStarred ? '#FFD93D' : 'transparent'} />
            </Pressable>
          </View>

          {/* Scrubber */}
          <View className="px-8 mt-6">
            {renderScrubber()}
          </View>

          {/* Controls */}
          <View className="px-4">
            {renderControls()}
          </View>

          {/* Queue */}
          <View className="mt-8 bg-white border-t-4 border-black px-6 pt-6 min-h-[300px]">
            {renderQueueList()}
          </View>
        </ScrollView>
      )}

      <AddToPlaylistModal
        visible={isAddToPlaylistVisible}
        onClose={() => setIsAddToPlaylistVisible(false)}
        songsToAdd={currentTrack ? [{
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          duration: currentTrack.duration,
        }] : []}
      />
    </SafeAreaView>
  );
}

