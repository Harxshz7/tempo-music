import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  Linking,
  Pressable
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { cacheDirectory, readDirectoryAsync, getInfoAsync, deleteAsync } from 'expo-file-system';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subsonic from '../api/subsonic';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { NeoText, NeoButton, NeoCard, NeoBadge, NeoSwitch } from '../components/ui';

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
  const { serverConfig, logout } = useAuthStore();
  
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [bgPlayback, setBgPlayback] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [cacheSize, setCacheSize] = useState('0 MB');

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
        } catch (e) {
          console.log('Error calculating cache:', e);
        }
      };
      calcCache();
      
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
  }, []);

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
    Alert.alert('Clear Cache', 'Are you sure you want to delete all cached files?', [
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
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to clear cache');
          }
        }
      }
    ]);
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
        }
      }
    ]);
  };

  const openSource = () => {
    Linking.openURL('https://github.com/TempoMusic/tempo-music');
  };

  const version = Constants.expoConfig?.version || '1.0.0';
  const serverUrlStr = serverConfig?.serverUrl || '—';
  
  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <HalftoneBackground />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 90, paddingTop: 16 }}>
        
        {/* Header */}
        <View className="mb-8 items-center -rotate-1 mt-4">
          <NeoText 
              className="font-space-grotesk-black text-4xl uppercase tracking-tighter"
              style={{
                color: 'transparent',
                WebkitTextStrokeWidth: '2px',
                WebkitTextStrokeColor: 'black',
                ...(Platform.OS !== 'web' ? { color: 'black' } : {})
              } as any}
          >
            SETTINGS
          </NeoText>
        </View>

        {/* SERVER SECTION */}
        <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <View className="p-4 border-b-4 border-black">
            <NeoText className="font-black uppercase text-xs tracking-widest">SERVER</NeoText>
          </View>
          <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
            <NeoText className="font-bold text-sm">Server URL</NeoText>
            <NeoText className="font-medium text-sm opacity-70 flex-shrink ml-4" numberOfLines={1}>{serverUrlStr}</NeoText>
          </View>
          <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
            <NeoText className="font-bold text-sm">Username</NeoText>
            <NeoText className="font-medium text-sm opacity-70 flex-shrink ml-4" numberOfLines={1}>{serverConfig?.username || '—'}</NeoText>
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

        {/* PLAYBACK SECTION */}
        <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <View className="p-4 border-b-4 border-black">
            <NeoText className="font-black uppercase text-xs tracking-widest">PLAYBACK</NeoText>
          </View>
          <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20">
            <NeoText className="font-bold text-sm flex-shrink mr-4">Background Playback</NeoText>
            <NeoSwitch value={bgPlayback} onValueChange={handleBgPlayback} />
          </View>
          <View className="p-4 flex-row justify-between items-center">
            <NeoText className="font-bold text-sm flex-shrink mr-4">Download Over Wi-Fi Only</NeoText>
            <NeoSwitch value={wifiOnly} onValueChange={handleWifiOnly} />
          </View>
        </NeoCard>

        {/* CACHE SECTION */}
        <NeoCard className="bg-white p-0 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <View className="p-4 border-b-4 border-black">
            <NeoText className="font-black uppercase text-xs tracking-widest">CACHE</NeoText>
          </View>
          <View className="p-4 flex-row justify-between items-center border-b-2 border-black/20 mb-4">
            <NeoText className="font-bold text-sm">Cache Size</NeoText>
            <NeoText className="font-medium text-sm">{cacheSize}</NeoText>
          </View>
          <View className="px-4 pb-4">
             <NeoButton label="CLEAR CACHE" variant="ghost" className="border-4 border-black h-12" onPress={handleClearCache} />
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
    </SafeAreaView>
  );
}
