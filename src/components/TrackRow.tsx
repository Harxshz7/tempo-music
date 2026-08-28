import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { NeoText } from './ui';
import { Track } from '../store/playerStore';
import type { Song } from '../types';
import subsonic from '../api/subsonic';

interface TrackRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  onPress: () => void;
  onMenuPress: (track: Track) => void;
  albumArtUrl?: string; // used for mapping if coverArt isn't on song
  fallbackArtist?: string; // used if song doesn't have artist
}

export default function TrackRow({
  song,
  index,
  isPlaying,
  onPress,
  onMenuPress,
  albumArtUrl,
  fallbackArtist
}: TrackRowProps) {
  
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

  return (
    <Pressable 
      className={`flex-row items-center px-4 py-3 border-b-2 border-black ${isPlaying ? 'bg-neo-secondary/30' : ''}`}
      onPress={onPress}
    >
      <View className="w-8 items-center justify-center mr-2">
        {isPlaying ? (
          <ActivityIndicator size="small" color="black" />
        ) : (
          <NeoText variant="caption" className="font-black text-sm">{song.track || index + 1}</NeoText>
        )}
      </View>
      <View className="flex-1 mr-4">
        <NeoText variant="body" numberOfLines={1} className="font-bold text-sm">
          {song.title}
        </NeoText>
        {!!song.artist && (
          <NeoText variant="caption" numberOfLines={1} className="font-bold text-xs opacity-60">
            {song.artist}
          </NeoText>
        )}
      </View>
      <NeoText variant="caption" className="font-bold text-xs opacity-60 mr-4">
        {formatDuration(song.duration)}
      </NeoText>
      <Pressable onPress={() => onMenuPress(mapToTrack())} className="p-2">
        <MoreHorizontal color="black" size={20} />
      </Pressable>
    </Pressable>
  );
}
