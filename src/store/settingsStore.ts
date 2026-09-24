import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServerConfig } from '../types';

export type AudioBitrate = 0 | 320 | 192 | 128; // 0 = raw / no transcode

interface SettingsState {
  audioBitrate: AudioBitrate;
  savedServers: ServerConfig[];

  subsonicScrobbleEnabled: boolean;

  setAudioBitrate: (bitrate: AudioBitrate) => void;
  setSubsonicScrobbleEnabled: (enabled: boolean) => void;

  addSavedServer: (server: ServerConfig) => void;
  removeSavedServer: (serverUrl: string, username: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      audioBitrate: 0,
      savedServers: [],

      subsonicScrobbleEnabled: false, // Default off per requirement

      setAudioBitrate: (audioBitrate) => set({ audioBitrate }),
      setSubsonicScrobbleEnabled: (subsonicScrobbleEnabled) => set({ subsonicScrobbleEnabled }),

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
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version !== 2) {
          // Older versions carried themeMode/lastfm fields that were never wired
          // up to any behaviour; reset so they don't linger in storage.
          return { audioBitrate: 0, savedServers: [], subsonicScrobbleEnabled: false };
        }
        return persistedState;
      },
    }
  )
);
