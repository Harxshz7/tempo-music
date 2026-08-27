import React, { useState } from 'react';
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { NeoText, NeoInput, NeoButton, NeoCard } from '../components/ui';

export default function LoginScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    if (!serverUrl || !username || !password) return;
    await login(serverUrl.trim(), username.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neo-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-10">
          <NeoText variant="h1" className="mb-2 text-neo-accent">Tempo</NeoText>
          <NeoText variant="body" className="text-gray-600">Connect to your music server</NeoText>
        </View>

        <NeoCard className="flex flex-col space-y-4">
          <View className="mb-4">
            <NeoInput
              placeholder="Server URL"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <View className="mb-4">
            <NeoInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View className="mb-4">
            <NeoInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? <NeoText variant="caption" className="text-neo-accent text-center mb-4 font-bold">{error}</NeoText> : null}

          <View className="items-center w-full mt-2">
            {isLoading ? (
               <View className="w-full py-4 items-center justify-center border-4 border-black bg-neo-accent">
                 <ActivityIndicator color="#000" size="small" />
               </View>
            ) : (
               <View className="w-full items-stretch">
                  <NeoButton 
                    label="Connect" 
                    onPress={handleLogin}
                  />
               </View>
            )}
          </View>
        </NeoCard>
      </View>
    </KeyboardAvoidingView>
  );
}
