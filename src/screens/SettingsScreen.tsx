import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  Linking,
  Pressable,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { cacheDirectory, readDirectoryAsync, getInfoAsync, deleteAsync } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Server, Moon, Sun, Music, HardDrive, Radio, Plus, Check, Trash2 } from 'lucide-react-native';
import subsonic, { SubsonicClient } from '../api/subsonic';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { useResponsive } from '../hooks/useResponsive';
import { NeoText, NeoButton, NeoCard, NeoBadge, NeoSwitch, NeoInput } from '../components/ui';
import { useSettingsStore, AudioBitrate, ThemeMode } from '../store/settingsStore';
import { offlineService } from '../services/offlineService';
import type { ServerConfig } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { showToast } from '../services/toast';

const HalftoneBackground = () => (
  <View className="absolute inset-0 opacity-10" pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="halftone_settings" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="3" fill="#000" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halftone_settings)" />
    </Svg>
  </View>
);

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { serverConfig, logout, login } = useAuthStore();
  const { containerClass } = useResponsive();

  const {
    themeMode,
    setThemeMode,
    audioBitrate,
    setAudioBitrate,
    savedServers,
    addSavedServer,
    removeSavedServer,
    subsonicScrobbleEnabled,
    setSubsonicScrobbleEnabled,
    lastfmScrobbleEnabled,
    setLastfmScrobbleEnabled,
    lastfmApiKey,
    lastfmSessionKey,
    setLastfmCredentials,
  } = useSettingsStore();

  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [bgPlayback, setBgPlayback] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [offlineSize, setOfflineSize] = useState('0 MB');

  // Server switch modal states
  const [showServerModal, setShowServerModal] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAddingServer, setIsAddingServer] = useState(false);

  // Last.fm modal state
  const [showLastfmModal, setShowLastfmModal] = useState(false);
  const [tempLastfmKey, setTempLastfmKey] = useState(lastfmApiKey);
  const [tempLastfmSecret, setTempLastfmSecret] = useState(lastfmSessionKey);

  useFocusEffect(
    useCallback(() => {
      const checkServer = async () => {
        try {
          await subsonic.ping();
          setServerStatus('ok');
        } catch {
          setServerStatus('error');
        }
      };
      checkServer();

      const calcCache = async () => {
        if (!cacheDirectory) return;
        try {
          let totalSize = 0;
          const files = await readDirectoryAsync(cacheDirectory);
          for (const file of files) {
            const info = await getInfoAsync(cacheDirectory + file);
            if (info.exists && !info.isDirectory) {
              totalSize += info.size || 0;
            }
          }
          const mb = (totalSize / 1024 / 1024).toFixed(1);
          setCacheSize(`${mb} MB`);
        } catch (e) {}
      };
      calcCache();

      const calcOffline = async () => {
        const bytes = await offlineService.getOfflineStorageSize();
        const mb = (bytes / 1024 / 1024).toFixed(1);
        setOfflineSize(`${mb} MB`);
      };
      calcOffline();

      return () => {};
    }, [])
  );

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const bg = await AsyncStorage.getItem('pref_bgPlayback');
        const wifi = await AsyncStorage.getItem('pref_wifiOnly');
        if (bg !== null) setBgPlayback(bg === 'true');
        if (wifi !== null) setWifiOnly(wifi === 'true');
      } catch (e) {}
    };
    loadPrefs();

    // Auto save current server to savedServers list if missing
    if (serverConfig) {
      addSavedServer(serverConfig);
    }
  }, [serverConfig]);

  const savePref = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (e) {}
  };

  const handleBgPlayback = (val: boolean) => {
    setBgPlayback(val);
    savePref('pref_bgPlayback', val);
  };

  const handleWifiOnly = (val: boolean) => {
    setWifiOnly(val);
    savePref('pref_wifiOnly', val);
  };

  const handleClearCache = () => {
    Alert.alert('Clear Image Cache', 'Are you sure you want to delete cached cover art?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            if (cacheDirectory) {
              const files = await readDirectoryAsync(cacheDirectory);
              for (const file of files) {
                await deleteAsync(cacheDirectory + file, { idempotent: true });
              }
              setCacheSize('0.0 MB');
              showToast('Cache cleared', 'success');
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to clear cache');
          }
        },
      },
    ]);
  };

  const handleClearOfflineDownloads = () => {
    Alert.alert('Clear Downloaded Audio', 'Are you sure you want to delete all offline songs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await offlineService.removeAllDownloads();
          setOfflineSize('0.0 MB');
        },
      },
    ]);
  };

  const handleSwitchServer = async (server: ServerConfig) => {
    triggerHaptic();
    try {
      await subsonic.saveConfig(server);
      await subsonic.ping();
      useAuthStore.setState({ isAuthenticated: true, serverConfig: server });
      showToast(`Switched to ${server.serverUrl}`, 'success');
      setShowServerModal(false);
    } catch (err: any) {
      showToast('Failed to connect to selected server', 'error');
    }
  };

  const handleAddServer = async () => {
    if (!newServerUrl.trim() || !newUsername.trim() || !newPassword.trim()) return;
    setIsAddingServer(true);
    try {
      const success = await login(newServerUrl.trim(), newUsername.trim(), newPassword.trim());
      if (success) {
        setNewServerUrl('');
        setNewUsername('');
        setNewPassword('');
        setShowServerModal(false);
        showToast('Connected to new server', 'success');
      }
    } catch (e: any) {
      showToast(e?.message || 'Login failed', 'error');
    } finally {
      setIsAddingServer(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out?', "You'll need to sign in again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          usePlayerStore.setState({ queue: [], currentTrack: null, isPlaying: false, positionMillis: 0, durationMillis: 0 });
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const openSource = () => {
    Linking.openURL('https://github.com/TempoMusic/tempo-music');
  };

  const version = Constants.expoConfig?.version || '1.0.0';
  const serverUrlStr = serverConfig?.serverUrl || '—';

  const bitrateOptions: { value: AudioBitrate; label: string }[] = [
    { value: 0, label: 'RAW (MAX)' },
    { value: 320, label: '320 KBPS' },
    { value: 192, label: '192 KBPS' },
    { value: 128, label: '128 KBPS' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <HalftoneBackground />
      <View className={`flex-1 ${containerClass}`}>
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 110, paddingTop: 16 }}>
          {/* Header */}
          <View className="mb-8 items-center -rotate-1 mt-4">
            <NeoText
              className="font-space-grotesk-black text-4xl uppercase tracking-tighter"
              style={
                Platform.OS === 'web'
                  ? ({
                      color: 'transparent',
                      WebkitTextStrokeWidth: '2px',
                      WebkitTextStrokeColor: 'black',
                    } as any)
                  : { color: 'black' }
              }
            >
              SETTINGS
            </NeoText>
          </View>

          {/* THEME TOGGLE */}
          <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black">
              <NeoText className="font-black uppercase text-xs tracking-widest">THEME & APPEARANCE</NeoText>
            </View>
            <View className="p-4 flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <NeoText className="font-bold text-sm">Color Mode</NeoText>
                <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5">
                  Neo-Brutalist Light / Dark theme contrast
                </NeoText>
              </View>
              <View className="flex-row border-2 border-black bg-neo-bg">
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setThemeMode('light');
                  }}
                  className={`px-3 py-1.5 flex-row items-center gap-1 ${
                    themeMode === 'light' ? 'bg-neo-secondary' : 'bg-white'
                  }`}
                >
                  <Sun color="black" size={16} />
                  <NeoText className="font-black text-xs">LIGHT</NeoText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setThemeMode('dark');
                  }}
                  className={`px-3 py-1.5 flex-row items-center gap-1 border-l-2 border-black ${
                    themeMode === 'dark' ? 'bg-neo-secondary' : 'bg-white'
                  }`}
                >
                  <Moon color="black" size={16} />
                  <NeoText className="font-black text-xs">DARK</NeoText>
                </Pressable>
              </View>
            </View>
          </NeoCard>

          {/* SERVER SECTION */}
          <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black flex-row justify-between items-center">
              <NeoText className="font-black uppercase text-xs tracking-widest">SERVER</NeoText>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setShowServerModal(true);
                }}
                className="bg-neo-secondary border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:opacity-75"
              >
                <NeoText variant="caption" className="font-black text-[10px] uppercase">
                  SWITCH SERVER
                </NeoText>
              </Pressable>
            </View>
            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Server URL</NeoText>
              <NeoText className="font-medium text-sm opacity-70 flex-shrink ml-4" numberOfLines={1}>
                {serverUrlStr}
              </NeoText>
            </View>
            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Username</NeoText>
              <NeoText className="font-medium text-sm opacity-70 flex-shrink ml-4" numberOfLines={1}>
                {serverConfig?.username || '—'}
              </NeoText>
            </View>
            <View className="p-4 flex-row justify-between items-center">
              <NeoText className="font-bold text-sm">Status</NeoText>
              {serverStatus === 'checking' ? (
                <NeoBadge label="CHECKING..." variant="primary" />
              ) : serverStatus === 'ok' ? (
                <NeoBadge label="CONNECTED" variant="secondary" />
              ) : (
                <NeoBadge label="OFFLINE" variant="primary" className="bg-neo-accent" />
              )}
            </View>
          </NeoCard>

          {/* AUDIO QUALITY & PLAYBACK */}
          <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black">
              <NeoText className="font-black uppercase text-xs tracking-widest">AUDIO & TRANSCODING</NeoText>
            </View>
            
            <View className="p-4 border-b-2 border-black/20">
              <NeoText className="font-bold text-sm mb-2">Streaming Bitrate Quality</NeoText>
              <View className="flex-row flex-wrap gap-2">
                {bitrateOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      triggerHaptic();
                      setAudioBitrate(opt.value);
                    }}
                    className={`border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      audioBitrate === opt.value ? 'bg-neo-secondary' : 'bg-white'
                    }`}
                  >
                    <NeoText className="font-black text-xs uppercase">{opt.label}</NeoText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center gap-2">
                  <NeoText className="font-bold text-sm">Background Playback</NeoText>
                  <NeoBadge
                    label={bgPlayback ? 'ENABLED' : 'DISABLED'}
                    variant={bgPlayback ? 'secondary' : 'primary'}
                    className={!bgPlayback ? 'bg-neo-bg' : ''}
                  />
                </View>
                <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5">
                  Keep music playing when app is in background
                </NeoText>
              </View>
              <NeoSwitch value={bgPlayback} onValueChange={handleBgPlayback} />
            </View>

            <View className="p-4 flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center gap-2">
                  <NeoText className="font-bold text-sm">Download Over Wi-Fi Only</NeoText>
                  <NeoBadge
                    label={wifiOnly ? 'ENABLED' : 'DISABLED'}
                    variant={wifiOnly ? 'secondary' : 'primary'}
                    className={!wifiOnly ? 'bg-neo-bg' : ''}
                  />
                </View>
                <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5">
                  Save cellular data when caching songs
                </NeoText>
              </View>
              <NeoSwitch value={wifiOnly} onValueChange={handleWifiOnly} />
            </View>
          </NeoCard>

          {/* SCROBBLING SECTION */}
          <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black">
              <NeoText className="font-black uppercase text-xs tracking-widest">SCROBBLING</NeoText>
            </View>

            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <View className="flex-1 mr-4">
                <NeoText className="font-bold text-sm">Subsonic Native Scrobble</NeoText>
                <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5">
                  Report plays to your Subsonic/Navidrome server (off by default)
                </NeoText>
              </View>
              <NeoSwitch
                value={subsonicScrobbleEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  setSubsonicScrobbleEnabled(val);
                }}
              />
            </View>

            <View className="p-4 flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <NeoText className="font-bold text-sm">Last.fm Scrobble</NeoText>
                <NeoText variant="caption" className="font-medium text-xs opacity-60 mt-0.5">
                  Scrobble tracks to Last.fm (requires user credentials)
                </NeoText>
              </View>
              <NeoSwitch
                value={lastfmScrobbleEnabled}
                onValueChange={(val) => {
                  triggerHaptic();
                  if (val && (!lastfmApiKey || !lastfmSessionKey)) {
                    setShowLastfmModal(true);
                  }
                  setLastfmScrobbleEnabled(val);
                }}
              />
            </View>

            {lastfmScrobbleEnabled && (
              <View className="px-4 pb-4">
                <NeoButton
                  label="CONFIGURE LAST.FM CREDENTIALS"
                  variant="ghost"
                  className="border-2 border-black h-10"
                  onPress={() => setShowLastfmModal(true)}
                />
              </View>
            )}
          </NeoCard>

          {/* STORAGE & OFFLINE MANAGEMENT */}
          <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black">
              <NeoText className="font-black uppercase text-xs tracking-widest">STORAGE & OFFLINE</NeoText>
            </View>

            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Downloaded Audio Storage</NeoText>
              <NeoText className="font-medium text-sm">{offlineSize}</NeoText>
            </View>
            <View className="px-4 py-3 border-b-2 border-black/20">
              <NeoButton
                label="DELETE DOWNLOADED AUDIO"
                variant="ghost"
                className="border-2 border-black h-10"
                onPress={handleClearOfflineDownloads}
              />
            </View>

            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Cover Art Cache Size</NeoText>
              <NeoText className="font-medium text-sm">{cacheSize}</NeoText>
            </View>
            <View className="px-4 py-3">
              <NeoButton
                label="CLEAR IMAGE CACHE"
                variant="ghost"
                className="border-2 border-black h-10"
                onPress={handleClearCache}
              />
            </View>
          </NeoCard>

          {/* ABOUT SECTION */}
          <NeoCard className="bg-white p-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <View className="p-4 border-b-4 border-black">
              <NeoText className="font-black uppercase text-xs tracking-widest">ABOUT</NeoText>
            </View>
            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Version</NeoText>
              <NeoText className="font-medium text-sm opacity-70">{version}</NeoText>
            </View>
            <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
              <NeoText className="font-bold text-sm">Source Code</NeoText>
              <Pressable onPress={openSource}>
                <NeoText className="font-bold text-sm text-neo-accent underline">GitHub</NeoText>
              </Pressable>
            </View>
            <View className="p-4 flex-row justify-between items-center">
              <NeoText className="font-bold text-sm">License</NeoText>
              <NeoText className="font-medium text-sm opacity-70">MIT</NeoText>
            </View>
          </NeoCard>

          {/* LOGOUT */}
          <View className="mt-8 mb-4">
            <NeoButton
              label="LOG OUT"
              variant="primary"
              className="bg-neo-accent h-14 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              onPress={handleLogout}
            />
          </View>
        </ScrollView>

        {/* SERVER SWITCH MODAL */}
        <Modal visible={showServerModal} transparent animationType="fade" onRequestClose={() => setShowServerModal(false)}>
          <Pressable className="flex-1 justify-center items-center bg-black/60 px-4" onPress={() => setShowServerModal(false)}>
            <Pressable className="w-full max-w-md" onPress={(e) => e.stopPropagation()}>
              <NeoCard className="p-6 bg-neo-bg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
                <NeoText variant="h2" className="font-black uppercase text-xl mb-4">
                  SERVERS MANAGER
                </NeoText>

                {savedServers.length > 0 && (
                  <View className="mb-4">
                    <NeoText variant="caption" className="font-bold uppercase opacity-60 mb-2">
                      Saved Servers ({savedServers.length})
                    </NeoText>
                    {savedServers.map((srv, idx) => {
                      const isActive = srv.serverUrl === serverConfig?.serverUrl && srv.username === serverConfig?.username;
                      return (
                        <View
                          key={idx}
                          className={`flex-row items-center justify-between p-3 border-2 border-black mb-2 ${
                            isActive ? 'bg-neo-secondary' : 'bg-white'
                          }`}
                        >
                          <Pressable className="flex-1 mr-2" onPress={() => handleSwitchServer(srv)}>
                            <NeoText className="font-black text-sm uppercase">{srv.username}</NeoText>
                            <NeoText variant="caption" numberOfLines={1} className="font-medium text-xs opacity-70">
                              {srv.serverUrl}
                            </NeoText>
                          </Pressable>
                          {isActive ? (
                            <NeoBadge label="ACTIVE" variant="secondary" className="bg-black text-white" />
                          ) : (
                            <Pressable
                              onPress={() => removeSavedServer(srv.serverUrl, srv.username)}
                              className="p-1"
                            >
                              <Trash2 size={16} color="black" />
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                <NeoText variant="caption" className="font-bold uppercase opacity-60 mb-2">
                  Add New Server
                </NeoText>
                <NeoInput placeholder="SERVER URL" value={newServerUrl} onChangeText={setNewServerUrl} />
                <View className="h-2" />
                <NeoInput placeholder="USERNAME" value={newUsername} onChangeText={setNewUsername} />
                <View className="h-2" />
                <NeoInput placeholder="PASSWORD" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

                <View className="flex-row justify-end mt-4 gap-3">
                  <NeoButton label="CLOSE" variant="ghost" onPress={() => setShowServerModal(false)} />
                  <NeoButton
                    label={isAddingServer ? 'CONNECTING...' : 'ADD & CONNECT'}
                    variant="primary"
                    onPress={handleAddServer}
                    disabled={isAddingServer || !newServerUrl.trim() || !newUsername.trim() || !newPassword.trim()}
                  />
                </View>
              </NeoCard>
            </Pressable>
          </Pressable>
        </Modal>

        {/* LAST.FM MODAL */}
        <Modal visible={showLastfmModal} transparent animationType="fade" onRequestClose={() => setShowLastfmModal(false)}>
          <Pressable className="flex-1 justify-center items-center bg-black/60 px-4" onPress={() => setShowLastfmModal(false)}>
            <Pressable className="w-full max-w-md" onPress={(e) => e.stopPropagation()}>
              <NeoCard className="p-6 bg-neo-bg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
                <NeoText variant="h2" className="font-black uppercase text-xl mb-4">
                  LAST.FM SCROBBLE CREDENTIALS
                </NeoText>

                <NeoInput
                  placeholder="API KEY"
                  value={tempLastfmKey}
                  onChangeText={setTempLastfmKey}
                />
                <View className="h-3" />
                <NeoInput
                  placeholder="SESSION KEY"
                  value={tempLastfmSecret}
                  onChangeText={setTempLastfmSecret}
                />

                <View className="flex-row justify-end mt-4 gap-3">
                  <NeoButton label="CANCEL" variant="ghost" onPress={() => setShowLastfmModal(false)} />
                  <NeoButton
                    label="SAVE"
                    variant="primary"
                    onPress={() => {
                      setLastfmCredentials(tempLastfmKey.trim(), tempLastfmSecret.trim());
                      setShowLastfmModal(false);
                      showToast('Last.fm credentials saved', 'success');
                    }}
                  />
                </View>
              </NeoCard>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

