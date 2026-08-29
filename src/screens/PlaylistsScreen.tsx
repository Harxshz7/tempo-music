import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ListMusic } from 'lucide-react-native';
import subsonic from '../api/subsonic';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoCard, NeoButton } from '../components/ui';
import type { Playlist } from '../types';

export default function PlaylistsScreen() {
  const navigation = useNavigation<any>();
  const { containerClass } = useResponsive();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaylists = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await subsonic.getPlaylists();
      setPlaylists(result || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load playlists');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const renderItem = ({ item }: { item: Playlist }) => (
    <Pressable 
      onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id })}
      className="px-4 mb-3"
    >
      <View className="bg-white border-2 border-black p-3 flex-row items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <View className="w-12 h-12 border-2 border-black bg-neo-secondary items-center justify-center mr-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ListMusic color="white" size={24} />
        </View>
        <View className="flex-1">
          <NeoText variant="body" numberOfLines={1} className="font-black uppercase text-base tracking-tight">{item.name}</NeoText>
          <NeoText variant="caption" className="font-bold text-xs opacity-60 mt-0.5 uppercase tracking-wider">
            {item.songCount ?? 0} track{item.songCount !== 1 ? 's' : ''}
            {item.duration != null && ` • ${Math.round(item.duration / 60)} min`}
          </NeoText>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className={`flex-1 ${containerClass}`}>
        <View className="px-4 pt-6 pb-4">
          <View className="-rotate-1 self-start mb-4">
            <NeoText className="font-space-grotesk-black text-4xl uppercase tracking-tighter">
              Playlists
            </NeoText>
          </View>
        </View>

        {error && !isLoading && (
          <View className="px-4 mb-4">
            <View className="bg-neo-accent border-4 border-black p-4 items-center">
              <NeoText variant="body" className="font-bold text-center mb-4">{error}</NeoText>
              <NeoButton label="RETRY" onPress={() => loadPlaylists(true)} />
            </View>
          </View>
        )}

        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPlaylists(true)}
              tintColor="black"
            />
          }
          ListEmptyComponent={
            !isLoading && !error ? (
              <View className="flex-1 items-center justify-center px-6 py-20">
                <NeoCard className="items-center p-8 bg-white border-4 border-black rotate-1">
                  <NeoText variant="h3" className="font-black uppercase mb-2 text-center">NO PLAYLISTS FOUND</NeoText>
                  <NeoText variant="caption" className="font-bold opacity-70 text-center">Create playlists in Navidrome</NeoText>
                </NeoCard>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
