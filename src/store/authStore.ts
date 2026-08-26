import { create } from 'zustand';
import subsonic, { SubsonicClient } from '../api/subsonic';
import type { ServerConfig } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  serverConfig: ServerConfig | null;
  login: (serverUrl: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  serverConfig: null,

  login: async (serverUrl, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const salt = SubsonicClient.generateSalt();
      const token = SubsonicClient.generateToken(password, salt);

      const config: ServerConfig = {
        serverUrl,
        username,
        token,
        salt,
      };

      await subsonic.saveConfig(config);

      // Verify connection
      await subsonic.ping();

      set({ isAuthenticated: true, isLoading: false, serverConfig: config });
      return true;
    } catch (err: any) {
      await subsonic.clearConfig();
      set({
        isAuthenticated: false,
        isLoading: false,
        error: err?.message ?? 'Failed to connect to server',
      });
      return false;
    }
  },

  logout: async () => {
    await subsonic.clearConfig();
    set({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      serverConfig: null,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const config = await subsonic.loadConfig();
      if (config) {
        await subsonic.ping();
        set({ isAuthenticated: true, isLoading: false, serverConfig: config });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
