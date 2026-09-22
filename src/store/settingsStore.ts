import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServerConfig } from '../types';

export type ThemeMode = 'light' | 'dark';
export type AudioBitrate = 0 | 320 | 192 | 128; // 0 = raw / no transcode

interface SettingsState {
  themeMode: ThemeMode;
  audioBitrate: AudioBitrate;
  savedServers: ServerConfig[];

  subsonicScrobbleEnabled: boolean;
  lastfmScrobbleEnabled: boolean;
  lastfmApiKey: string;
  lastfmSessionKey: string;

  setThemeMode: (mode: ThemeMode) => void;
  setAudioBitrate: (bitrate: AudioBitrate) => void;
  setSubsonicScrobbleEnabled: (enabled: boolean) => void;
  setLastfmScrobbleEnabled: (enabled: boolean) => void;
  setLastfmCredentials: (apiKey: string, sessionKey: string) => void;

  addSavedServer: (server: ServerConfig) => void;
  removeSavedServer: (serverUrl: string, username: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      audioBitrate: 0,
      savedServers: [],

      subsonicScrobbleEnabled: false, // Default off per requirement
      lastfmScrobbleEnabled: false,   // Default off per requirement
      lastfmApiKey: '',
      lastfmSessionKey: '',

      setThemeMode: (themeMode) => set({ themeMode }),
      setAudioBitrate: (audioBitrate) => set({ audioBitrate }),
      setSubsonicScrobbleEnabled: (subsonicScrobbleEnabled) => set({ subsonicScrobbleEnabled }),
      setLastfmScrobbleEnabled: (lastfmScrobbleEnabled) => set({ lastfmScrobbleEnabled }),
      setLastfmCredentials: (lastfmApiKey, lastfmSessionKey) => set({ lastfmApiKey, lastfmSessionKey }),

      addSavedServer: (server) => set((state) => {
        const filtered = state.savedServers.filter(
          (s) => !(s.serverUrl === server.serverUrl && s.username === server.username)
        );
        return { savedServers: [server, ...filtered] };
      }),

      removeSavedServer: (serverUrl, username) => set((state) => ({
        savedServers: state.savedServers.filter(
          (s) => !(s.serverUrl === serverUrl && s.username === username)
        ),
      })),
    }),
    {
      name: 'tempo-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
