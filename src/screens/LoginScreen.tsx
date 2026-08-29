import React, { useState, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { NeoText, NeoInput, NeoButton, NeoCard } from '../components/ui';

const HalftoneBackground = () => (
  <View className="absolute inset-0 opacity-10" pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="halftone_login" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <Circle cx="3" cy="3" r="3" fill="#000" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halftone_login)" />
    </Svg>
  </View>
);

export default function LoginScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    setHasAttempted(true);
    
    const trimmedUser = username.trim();
    if (!serverUrl || !trimmedUser || !password) return;

    let finalUrl = serverUrl.trim();
    // Auto-prepend https:// if no protocol given
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    // Strip trailing slash
    finalUrl = finalUrl.replace(/\/+$/, '');

    await login(finalUrl, trimmedUser, password);
  };

  const getFriendlyError = (err: string | null) => {
    if (!err) return null;
    if (err.includes('error 40')) return 'Wrong username or password';
    if (err.includes('error 41')) return 'Token auth not supported by server';
    if (err.includes('Network error') || err.includes('Failed to connect')) return 'Could not reach server — check the URL';
    return err;
  };

  const friendlyError = getFriendlyError(error);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neo-bg relative"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <HalftoneBackground />
      <View className="flex-1 justify-center items-center px-6">
        
        {/* Header Block */}
        <View className="items-center mb-10 z-10">
          <View className="-rotate-1">
            <NeoText 
                className="font-space-grotesk-black text-6xl uppercase tracking-tighter"
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
              Tempo
            </NeoText>
          </View>
          <NeoText variant="caption" className="font-bold uppercase tracking-widest opacity-70 mt-2">
            Your music, your server.
          </NeoText>
        </View>

        {/* Form Card */}
        <View className="w-full max-w-[400px]">
          <NeoCard className="bg-white p-6 pb-8">
            
            <View className="mb-5">
              <NeoText variant="caption" className="font-bold uppercase text-xs mb-2 tracking-widest">
                Server URL
              </NeoText>
              <NeoInput
                placeholder="https://music.example.com"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                blurOnSubmit={false}
              />
              {hasAttempted && !serverUrl && (
                <NeoText variant="caption" className="text-neo-accent font-bold text-xs mt-1">Server URL is required</NeoText>
              )}
            </View>

            <View className="mb-5">
              <NeoText variant="caption" className="font-bold uppercase text-xs mb-2 tracking-widest">
                Username
              </NeoText>
              <NeoInput
                ref={usernameRef}
                placeholder="admin"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
              {hasAttempted && !username && (
                <NeoText variant="caption" className="text-neo-accent font-bold text-xs mt-1">Username is required</NeoText>
              )}
            </View>

            <View className="mb-6">
              <NeoText variant="caption" className="font-bold uppercase text-xs mb-2 tracking-widest">
                Password
              </NeoText>
              <NeoInput
                ref={passwordRef}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                rightIcon={
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2">
                    {showPassword ? <EyeOff size={20} color="black" /> : <Eye size={20} color="black" />}
                  </Pressable>
                }
              />
              {hasAttempted && !password && (
                <NeoText variant="caption" className="text-neo-accent font-bold text-xs mt-1">Password is required</NeoText>
              )}
            </View>

            {friendlyError ? (
              <View className="bg-neo-accent border-4 border-black p-3 mb-6">
                <NeoText variant="caption" className="font-bold text-sm text-center">
                  {friendlyError}
                </NeoText>
              </View>
            ) : null}

            <View className="w-full">
               <NeoButton 
                 label={isLoading ? "CONNECTING..." : "CONNECT"}
                 onPress={handleLogin}
                 fullWidth
                 disabled={isLoading}
               />
            </View>

          </NeoCard>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
