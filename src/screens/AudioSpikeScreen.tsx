import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { NeoText } from '../components/ui/NeoText';
import { NeoButton } from '../components/ui/NeoButton';
import { NeoCard } from '../components/ui/NeoCard';
import { useNavigation } from '@react-navigation/native';

// ──────────────────────────────────────────────────────────────────────────────
// SPIKE-ONLY TEST SCREEN — do NOT ship this.
//
// Purpose: validate expo-audio playback, background audio, lock-screen controls,
// and seeking accuracy in isolation (no interaction with the real player/store).
// ──────────────────────────────────────────────────────────────────────────────

let expoAudio: any = null;
let useAudioPlayer: any = null;
let useAudioPlayerStatus: any = null;
let setAudioModeAsync: any = null;

try {
  expoAudio = require('expo-audio');
  useAudioPlayer = expoAudio.useAudioPlayer;
  useAudioPlayerStatus = expoAudio.useAudioPlayerStatus;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  console.warn('[AudioSpike] expo-audio not available:', e);
}

// Public domain test track (Big Buck Bunny soundtrack extract, CC)
const DEFAULT_TEST_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export default function AudioSpikeScreen() {
  const navigation = useNavigation<any>();
  const [streamUrl, setStreamUrl] = useState(DEFAULT_TEST_URL);
  const [logs, setLogs] = useState<string[]>([]);
  const [seekTarget, setSeekTarget] = useState('30');

  const log = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  // ── Guard: expo-audio not loaded ────────────────────────────────────────
  if (!useAudioPlayer || !useAudioPlayerStatus) {
    return (
      <View className="flex-1 bg-neo-bg items-center justify-center p-6">
        <NeoText variant="h2" className="text-center mb-4">
          expo-audio not available
        </NeoText>
        <NeoText variant="body" className="text-center opacity-70">
          This screen requires the expo-audio native module.{'\n'}
          Run with a custom dev client:{'\n'}
          npx expo run:android / npx expo run:ios
        </NeoText>
      </View>
    );
  }

  return <AudioSpikeInner streamUrl={streamUrl} setStreamUrl={setStreamUrl} logs={logs} log={log} seekTarget={seekTarget} setSeekTarget={setSeekTarget} navigation={navigation} />;
}

// Separate component so hooks are only called when expo-audio is available
function AudioSpikeInner({
  streamUrl,
  setStreamUrl,
  logs,
  log,
  seekTarget,
  setSeekTarget,
  navigation,
}: {
  streamUrl: string;
  setStreamUrl: (v: string) => void;
  logs: string[];
  log: (msg: string) => void;
  seekTarget: string;
  setSeekTarget: (v: string) => void;
  navigation: any;
}) {
  const player = useAudioPlayer(streamUrl, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  // ── Configure audio session on mount ──────────────────────────────────
  useEffect(() => {
    if (setAudioModeAsync) {
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      })
        .then(() => log('Audio mode configured (background + doNotMix)'))
        .catch((e: any) => log(`Audio mode error: ${e.message}`));
    }
  }, []);

  // ── Log status changes ────────────────────────────────────────────────
  useEffect(() => {
    if (status) {
      log(
        `Status: playing=${status.playing} buffering=${status.isBuffering} loaded=${status.isLoaded} ` +
        `time=${status.currentTime?.toFixed(1)}s dur=${status.duration?.toFixed(1)}s`
      );
    }
  }, [status?.playing, status?.isBuffering, status?.isLoaded]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePlay = () => {
    log('▶ Play pressed');
    try {
      player.setActiveForLockScreen(true, {
        title: 'Spike Test Track',
        artist: 'expo-audio Spike',
        albumTitle: 'Tempo Migration Test',
      });
      log('Lock screen metadata set');
    } catch (e: any) {
      log(`Lock screen error: ${e.message}`);
    }
    player.play();
  };

  const handlePause = () => {
    log('⏸ Pause pressed');
    player.pause();
  };

  const handleSeek = async (offsetSeconds: number) => {
    const target = (status?.currentTime ?? 0) + offsetSeconds;
    const clampedTarget = Math.max(0, Math.min(target, status?.duration ?? 0));
    log(`Seeking to ${clampedTarget.toFixed(1)}s (offset ${offsetSeconds > 0 ? '+' : ''}${offsetSeconds}s)`);
    const before = Date.now();
    try {
      await player.seekTo(clampedTarget);
      const after = Date.now();
      log(`Seek completed in ${after - before}ms — position now ${player.currentTime?.toFixed(1)}s`);
    } catch (e: any) {
      log(`Seek error: ${e.message}`);
    }
  };

  const handleSeekAbsolute = async () => {
    const target = parseFloat(seekTarget);
    if (isNaN(target)) {
      log('Invalid seek target');
      return;
    }
    log(`Absolute seek to ${target}s`);
    const before = Date.now();
    try {
      await player.seekTo(target);
      const after = Date.now();
      log(`Seek completed in ${after - before}ms — position now ${player.currentTime?.toFixed(1)}s`);
    } catch (e: any) {
      log(`Seek error: ${e.message}`);
    }
  };

  const handleClearLockScreen = () => {
    log('Clearing lock screen controls');
    try {
      player.setActiveForLockScreen(false);
      log('Lock screen cleared');
    } catch (e: any) {
      log(`Clear lock screen error: ${e.message}`);
    }
  };

  const handleReplace = () => {
    log(`Replacing source with: ${streamUrl}`);
    try {
      player.replace(streamUrl);
      log('Source replaced');
    } catch (e: any) {
      log(`Replace error: ${e.message}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  const formatTime = (s: number | undefined) => {
    if (s == null || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    status?.duration && status.duration > 0
      ? Math.min(100, Math.max(0, ((status.currentTime ?? 0) / status.duration) * 100))
      : 0;

  return (
    <View className="flex-1 bg-neo-bg">
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View className="flex-row items-center mb-4 mt-12">
          <Pressable onPress={() => navigation.goBack()} className="mr-3">
            <NeoText variant="h2" className="text-2xl">←</NeoText>
          </Pressable>
          <NeoText variant="h2" className="text-xl uppercase">
            🧪 expo-audio Spike
          </NeoText>
        </View>

        {/* Platform info */}
        <NeoCard className="p-3 mb-4 bg-neo-secondary border-[3px] border-black">
          <NeoText variant="caption" className="uppercase font-bold">
            Platform: {Platform.OS} | expo-audio loaded: ✅
          </NeoText>
        </NeoCard>

        {/* Stream URL input */}
        <View className="mb-4">
          <NeoText variant="caption" className="uppercase font-bold mb-1">Stream URL</NeoText>
          <TextInput
            value={streamUrl}
            onChangeText={setStreamUrl}
            className="border-[3px] border-black bg-white p-2 font-bold text-xs"
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={handleReplace}
            className="mt-2 bg-neo-muted border-[3px] border-black px-4 py-2 items-center"
          >
            <NeoText variant="caption" className="uppercase font-bold">Load URL</NeoText>
          </Pressable>
        </View>

        {/* Status Display */}
        <NeoCard className="p-3 mb-4 bg-white border-[3px] border-black">
          <NeoText variant="caption" className="uppercase font-bold mb-2">Player Status</NeoText>
          <View className="flex-row flex-wrap gap-2">
            <StatusBadge label="Playing" value={status?.playing} />
            <StatusBadge label="Loaded" value={status?.isLoaded} />
            <StatusBadge label="Buffering" value={status?.isBuffering} />
          </View>
          <NeoText variant="body" className="mt-2 font-bold">
            {formatTime(status?.currentTime)} / {formatTime(status?.duration)}
          </NeoText>
          {/* Progress bar */}
          <View className="h-3 bg-gray-200 border-[2px] border-black mt-2 relative">
            <View
              className="absolute top-0 left-0 bottom-0 bg-neo-accent"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </NeoCard>

        {/* Playback Controls */}
        <NeoText variant="caption" className="uppercase font-bold mb-2">Controls</NeoText>
        <View className="flex-row flex-wrap gap-3 mb-4">
          <SpikeButton label="▶ Play" onPress={handlePlay} color="bg-green-400" />
          <SpikeButton label="⏸ Pause" onPress={handlePause} color="bg-neo-accent" />
          <SpikeButton label="⏪ -10s" onPress={() => handleSeek(-10)} color="bg-white" />
          <SpikeButton label="⏩ +10s" onPress={() => handleSeek(10)} color="bg-white" />
          <SpikeButton label="⏪ -30s" onPress={() => handleSeek(-30)} color="bg-white" />
          <SpikeButton label="⏩ +30s" onPress={() => handleSeek(30)} color="bg-white" />
        </View>

        {/* Absolute Seek */}
        <View className="flex-row items-center gap-2 mb-4">
          <TextInput
            value={seekTarget}
            onChangeText={setSeekTarget}
            className="border-[3px] border-black bg-white p-2 font-bold text-xs w-20"
            keyboardType="numeric"
            placeholder="sec"
          />
          <SpikeButton label="Seek To" onPress={handleSeekAbsolute} color="bg-neo-muted" />
        </View>

        {/* Lock Screen Controls */}
        <NeoText variant="caption" className="uppercase font-bold mb-2">Lock Screen</NeoText>
        <View className="flex-row flex-wrap gap-3 mb-4">
          <SpikeButton
            label="Set Metadata"
            onPress={() => {
              try {
                player.setActiveForLockScreen(true, {
                  title: 'Updated Title',
                  artist: 'Updated Artist',
                  albumTitle: 'Updated Album',
                });
                log('Lock screen metadata updated');
              } catch (e: any) {
                log(`Metadata error: ${e.message}`);
              }
            }}
            color="bg-neo-secondary"
          />
          <SpikeButton label="Clear Lock" onPress={handleClearLockScreen} color="bg-white" />
        </View>

        {/* Test Instructions */}
        <NeoCard className="p-3 mb-4 bg-neo-accent/20 border-[3px] border-black">
          <NeoText variant="caption" className="uppercase font-bold mb-1">Manual Test Checklist</NeoText>
          <NeoText variant="body" className="text-xs leading-5">
            1. Press Play → verify audio starts{'\n'}
            2. Lock device → verify audio continues{'\n'}
            3. Check lock screen → verify controls + metadata{'\n'}
            4. Use lock screen play/pause → verify response{'\n'}
            5. Seek ±10s → verify position jumps accurately{'\n'}
            6. Open another audio app → verify interruption behavior{'\n'}
            7. Return to Tempo → verify state is correct{'\n'}
            8. Kill app from recents → verify audio behavior{'\n'}
          </NeoText>
        </NeoCard>

        {/* Log Output */}
        <NeoText variant="caption" className="uppercase font-bold mb-2">
          Event Log ({logs.length})
        </NeoText>
        <View className="bg-black p-3 border-[3px] border-black mb-4" style={{ minHeight: 200 }}>
          {logs.map((entry, i) => (
            <NeoText key={i} variant="caption" className="text-green-400 text-[10px] leading-4 font-mono">
              {entry}
            </NeoText>
          ))}
          {logs.length === 0 && (
            <NeoText variant="caption" className="text-gray-500 text-[10px]">
              No events yet — press Play to start
            </NeoText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ label, value }: { label: string; value?: boolean }) {
  const bg = value ? 'bg-green-400' : 'bg-gray-300';
  return (
    <View className={`${bg} border-[2px] border-black px-2 py-1`}>
      <NeoText variant="caption" className="text-[10px] uppercase font-bold">
        {label}: {value ? 'YES' : 'NO'}
      </NeoText>
    </View>
  );
}

function SpikeButton({ label, onPress, color = 'bg-white' }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      className={`${color} border-[3px] border-black px-4 py-2 active:translate-x-[2px] active:translate-y-[2px]`}
      style={{ elevation: 3 }}
    >
      <NeoText variant="caption" className="uppercase font-bold text-xs">
        {label}
      </NeoText>
    </Pressable>
  );
}
