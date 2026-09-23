import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { MoreHorizontal, Star, HardDriveDownload } from 'lucide-react-native';
import { NeoText } from './ui';
import { Track } from '../store/playerStore';
import type { Song } from '../types';
import subsonic from '../api/subsonic';
import { triggerHaptic } from '../utils/haptics';
import { useStarredStore } from '../store/starredStore';
import { useOfflineStore } from '../services/offlineService';

interface TrackRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  onPress: () => void;
  onMenuPress: (track: Track) => void;
  albumArtUrl?: string; // used for mapping if coverArt isn't on song
  fallbackArtist?: string; // used if song doesn't have artist
  showStarToggle?: boolean;
}

export const TRACK_ROW_HEIGHT = 60;

export default function TrackRow({
  song,
  index,
  isPlaying,
  onPress,
  onMenuPress,
  albumArtUrl,
  fallbackArtist,
  showStarToggle = true,
}: TrackRowProps) {
  const isStarred = useStarredStore((state) => state.isSongStarred(song.id, song.starred));
  const toggleStar = useStarredStore((state) => state.toggleStarSong);

  const isDownloaded = useOfflineStore((state) => state.downloads[song.id]?.status === 'done');

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const mapToTrack = (): Track => {
    return {
      id: song.id,
      title: song.title,
      artist: song.artist || fallbackArtist || 'Unknown',
      coverArtUrl: song.coverArt ? subsonic.getCoverArtUrl(song.coverArt) : albumArtUrl,
      streamUrl: subsonic.getStreamUrl(song.id),
      duration: song.duration || 0,
    };
  };

  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  const handleStarPress = () => {
    triggerHaptic();
    toggleStar(song.id, isStarred);
  };

  return (
    <Pressable 
      className={`flex-row items-center px-4 py-3 min-h-[56px] border-b-2 border-black active:opacity-70 ${isPlaying ? 'bg-neo-secondary/30' : 'bg-transparent active:bg-black/5'}`}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${song.title} by ${song.artist || fallbackArtist || 'Unknown'}`}
      accessibilityHint="Double tap to play track"
    >
      <View className="w-8 items-center justify-center mr-2">
        {isPlaying ? (
          <ActivityIndicator size="small" color="black" />
        ) : (
          <NeoText variant="caption" className="font-black text-sm">{song.track || index + 1}</NeoText>
        )}
      </View>
      
      <View className="flex-1 mr-2">
        <View className="flex-row items-center gap-1.5">
          <NeoText variant="body" numberOfLines={1} className="font-bold text-sm flex-shrink">
            {song.title}
          </NeoText>
          {isDownloaded && (
            <HardDriveDownload color="#FFD93D" size={14} fill="black" />
          )}
        </View>
        {!!(song.artist || fallbackArtist) && (
          <NeoText variant="caption" numberOfLines={1} className="font-bold text-xs opacity-60">
            {song.artist || fallbackArtist}
          </NeoText>
        )}
      </View>

      <NeoText variant="caption" className="font-bold text-xs opacity-60 mr-2">
        {formatDuration(song.duration)}
      </NeoText>

      {showStarToggle && (
        <Pressable
          onPress={handleStarPress}
          className="w-9 h-9 items-center justify-center active:opacity-60"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isStarred ? `Unstar ${song.title}` : `Star ${song.title}`}
          accessibilityHint="Toggles favorite status"
        >
          <Star
            color="black"
            size={18}
            fill={isStarred ? '#FFD93D' : 'transparent'}
          />
        </Pressable>
      )}

      <Pressable 
        onPress={() => {
          triggerHaptic();
          onMenuPress(mapToTrack());
        }} 
        className="w-9 h-9 items-center justify-center -mr-2 active:opacity-60"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${song.title}`}
        accessibilityHint="Opens track context menu"
      >
        <MoreHorizontal color="black" size={20} />
      </Pressable>
    </Pressable>
  );
}


