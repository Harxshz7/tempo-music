import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import subsonic from '../api/subsonic';
import type { Artist } from '../types';

export default function LibraryScreen() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArtists = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const result = await subsonic.getArtists();
      const allArtists = (result.index ?? []).flatMap((idx) => idx.artist ?? []);
      setArtists(allArtists);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load library');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1db954" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.artistName}>{item.name}</Text>
            {item.albumCount != null && (
              <Text style={styles.albumCount}>{item.albumCount} album{item.albumCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadArtists(true)}
            tintColor="#1db954"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No artists found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  artistName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  albumCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#1e1e1e',
    marginLeft: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});
