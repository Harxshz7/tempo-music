import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import subsonic from '../api/subsonic';
import type { Artist, Album, Song } from '../types';

interface SearchState {
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchState>({
    artists: [],
    albums: [],
    songs: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (text: string) => {
    if (!text.trim()) {
      setResults({ artists: [], albums: [], songs: [] });
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await subsonic.search3(text.trim());
      setResults({
        artists: res.artist?.artist ?? [],
        albums: res.album?.album ?? [],
        songs: res.song?.song ?? [],
      });
    } catch {
      setResults({ artists: [], albums: [], songs: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const totalResults =
    results.artists.length + results.albums.length + results.songs.length;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search artists, albums, songs..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1db954" />
        </View>
      ) : (
        <FlatList
          data={[{ type: 'header' as const }]}
          keyExtractor={() => 'results'}
          renderItem={() => (
            <View style={styles.results}>
              {hasSearched && totalResults === 0 && (
                <Text style={styles.empty}>No results found</Text>
              )}

              {results.artists.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Artists</Text>
                  {results.artists.map((a) => (
                    <View key={a.id} style={styles.row}>
                      <Text style={styles.rowText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {results.albums.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Albums</Text>
                  {results.albums.map((a) => (
                    <View key={a.id} style={styles.row}>
                      <Text style={styles.rowText}>{a.name}</Text>
                      {a.artist && (
                        <Text style={styles.rowSub}>{a.artist}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {results.songs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Songs</Text>
                  {results.songs.map((s) => (
                    <View key={s.id} style={styles.row}>
                      <Text style={styles.rowText}>{s.title}</Text>
                      {s.artist && (
                        <Text style={styles.rowSub}>
                          {s.artist}{s.album ? ` — ${s.album}` : ''}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchBar: {
    padding: 12,
    backgroundColor: '#121212',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  results: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1db954',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: {
    fontSize: 15,
    color: '#fff',
  },
  rowSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});
