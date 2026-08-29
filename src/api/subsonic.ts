import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ServerConfig,
  ArtistIndex,
  Artist,
  Album,
  Song,
  Playlist,
  AlbumListType,
  SearchResults,
  SubsonicResponse,
} from '../types';

const STORAGE_KEY = 'tempo_server_config';

class SubsonicClient {
  private config: ServerConfig | null = null;
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Config persistence
  // ---------------------------------------------------------------------------

  async loadConfig(): Promise<ServerConfig | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.config = JSON.parse(raw);
        return this.config;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  async saveConfig(config: ServerConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  async clearConfig(): Promise<void> {
    this.config = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  getConfig(): ServerConfig | null {
    return this.config;
  }

  // ---------------------------------------------------------------------------
  // Auth helpers
  // ---------------------------------------------------------------------------

  /** Generate token hash: md5(password + salt) */
  static generateToken(password: string, salt: string): string {
    return CryptoJS.MD5(password + salt).toString();
  }

  /** Generate a random salt */
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  // ---------------------------------------------------------------------------
  // Core request method
  // ---------------------------------------------------------------------------

  private async request<T = unknown>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    if (!this.config) {
      throw new Error('No server configured. Please log in first.');
    }

    const baseUrl = this.config.serverUrl.replace(/\/+$/, '');

    const queryParams: Record<string, string> = {
      u: this.config.username,
      t: this.config.token,
      s: this.config.salt,
      v: '1.16.1',
      c: 'Tempo',
      f: 'json',
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
    };

    try {
      const response = await this.http.get(
        `${baseUrl}/rest/${endpoint}`,
        { params: queryParams }
      );

      const data = response.data as SubsonicResponse<T>;

      if (data['subsonic-response']?.status === 'failed') {
        const err = data['subsonic-response'].error;
        throw new Error(
          `Subsonic error ${err?.code}: ${err?.message ?? 'Unknown error'}`
        );
      }

      return data['subsonic-response'] as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Network error: ${error.message}. Check your server URL.`
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Subsonic API methods
  // ---------------------------------------------------------------------------

  /** Ping the server to verify connectivity and auth */
  async ping(): Promise<{ status: string }> {
    const result = await this.request<{ status: string }>('ping');
    return result;
  }

  /** Get an indexed collection of artists */
  async getArtists(): Promise<ArtistIndex> {
    const result = await this.request<{ artists?: ArtistIndex; index?: any[] }>('getArtists');
    if (result.artists) {
      return {
        ...result.artists,
        index: result.artists.index ?? [],
      };
    }
    if (result.index) {
      return { index: result.index };
    }
    return { index: [] };
  }

  /** Get details for a single artist, including albums */
  async getArtist(
    id: string
  ): Promise<{ artist: Artist; album: Album[] }> {
    const result = await this.request<{ artist?: Artist & { album?: Album[] }; album?: Album[] }>(
      'getArtist',
      { id }
    );
    const artist = result.artist || (result as any) || { id, name: 'Unknown' };
    const album = result.artist?.album ?? result.album ?? [];
    return { artist, album };
  }

  /** Get details for a single album, including songs */
  async getAlbum(id: string): Promise<{ album: Album; song: Song[] }> {
    const result = await this.request<{ album?: Album & { song?: Song[] }; song?: Song[] }>(
      'getAlbum',
      { id }
    );
    const album = result.album || (result as any) || { id, name: 'Unknown' };
    const song = result.album?.song ?? result.song ?? [];
    return { album, song };
  }

  /** Get a sorted list of albums */
  async getAlbumList2(type: AlbumListType, size = 50, offset = 0): Promise<Album[]> {
    const result = await this.request<{ albumList2?: { album?: Album[] } }>(
      'getAlbumList2',
      { type, size, offset }
    );
    return result.albumList2?.album ?? [];
  }

  /** Full-text search across artists, albums, and songs */
  async search3(query: string, artistCount = 10, albumCount = 10, songCount = 10) {
    const result = await this.request<{
      searchResult3?: { artist?: Artist[]; album?: Album[]; song?: Song[] };
      searchResult2?: { artist?: Artist[]; album?: Album[]; song?: Song[] };
      artist?: { artist?: Artist[] };
      album?: { album?: Album[] };
      song?: { song?: Song[] };
    }>('search3', {
      query,
      artistCount,
      albumCount,
      songCount,
    });

    const artists = result.searchResult3?.artist ?? result.searchResult2?.artist ?? result.artist?.artist ?? [];
    const albums = result.searchResult3?.album ?? result.searchResult2?.album ?? result.album?.album ?? [];
    const songs = result.searchResult3?.song ?? result.searchResult2?.song ?? result.song?.song ?? [];

    return {
      artist: artists,
      album: albums,
      song: songs,
    };
  }

  /** Get the URL for a cover art image */
  getCoverArtUrl(id: string): string {
    if (!this.config) throw new Error('No server configured.');
    const baseUrl = this.config.serverUrl.replace(/\/+$/, '');
    return `${baseUrl}/rest/getCoverArt?id=${encodeURIComponent(id)}&u=${encodeURIComponent(this.config.username)}&t=${this.config.token}&s=${this.config.salt}&v=1.16.1&c=Tempo`;
  }

  /** Get the streaming URL for a song */
  getStreamUrl(id: string): string {
    if (!this.config) throw new Error('No server configured.');
    const baseUrl = this.config.serverUrl.replace(/\/+$/, '');
    return `${baseUrl}/rest/stream?id=${encodeURIComponent(id)}&u=${encodeURIComponent(this.config.username)}&t=${this.config.token}&s=${this.config.salt}&v=1.16.1&c=Tempo`;
  }

  /** Get all playlists */
  async getPlaylists(): Promise<Playlist[]> {
    const result = await this.request<{ playlists?: { playlist?: Playlist[] } }>(
      'getPlaylists'
    );
    return result.playlists?.playlist ?? [];
  }

  /** Get a single playlist with its songs */
  async getPlaylist(
    id: string
  ): Promise<{ playlist: Playlist; entry: Song[] }> {
    const result = await this.request<{
      playlist?: Playlist & { entry?: Song[] };
      entry?: Song[];
    }>('getPlaylist', { id });
    const playlist = result.playlist || (result as any) || { id, name: 'Playlist' };
    const entry = result.playlist?.entry ?? result.entry ?? [];
    return { playlist, entry };
  }

  /** Update a playlist */
  async updatePlaylist(playlistId: string, songIndexToRemove?: number, name?: string, comment?: string, publicPlaylist?: boolean): Promise<void> {
    const params: Record<string, string | number | boolean> = { playlistId };
    if (songIndexToRemove !== undefined) params.songIndexToRemove = songIndexToRemove;
    if (name !== undefined) params.name = name;
    if (comment !== undefined) params.comment = comment;
    if (publicPlaylist !== undefined) params.public = publicPlaylist;
    
    await this.request('updatePlaylist', params);
  }

  /** Delete a playlist */
  async deletePlaylist(id: string): Promise<void> {
    await this.request('deletePlaylist', { id });
  }
}

/** Singleton instance */
const subsonic = new SubsonicClient();
export default subsonic;
export { SubsonicClient };
