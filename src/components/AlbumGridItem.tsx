import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NeoText } from './ui';
import subsonic from '../api/subsonic';
import type { Album } from '../types';

interface AlbumGridItemProps {
  album: Album;
  index: number;
  numColumns: number;
  showArtistName?: boolean;
}

export default function AlbumGridItem({ album, index, numColumns, showArtistName = true }: AlbumGridItemProps) {
  const navigation = useNavigation<any>();
  const rotation = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
  
  return (
    <View style={{ width: `${100 / numColumns}%` }} className="p-2">
      <Pressable onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id })}>
        <View className={`bg-white border-4 border-black p-2 ${rotation} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
          <View className="aspect-square bg-neo-muted border-4 border-black mb-2 relative overflow-hidden">
             {album.coverArt ? (
               <Image source={{ uri: subsonic.getCoverArtUrl(album.coverArt) }} className="w-full h-full" />
             ) : (
               <View className="w-full h-full items-center justify-center bg-gray-200">
                  <NeoText variant="caption" className="opacity-50 font-bold">NO ART</NeoText>
               </View>
             )}
          </View>
          <NeoText variant="body" numberOfLines={1} className="font-black uppercase text-sm leading-tight tracking-tight">
            {album.name}
          </NeoText>
          {showArtistName ? (
            <NeoText variant="caption" numberOfLines={1} className="font-bold uppercase text-xs opacity-70 mt-0.5">
              {album.artist ?? 'Unknown'}
            </NeoText>
          ) : (
            <NeoText variant="caption" numberOfLines={1} className="font-bold uppercase text-xs opacity-70 mt-0.5">
              {album.year ? album.year : 'Unknown Year'}
            </NeoText>
          )}
        </View>
      </Pressable>
    </View>
  );
}
