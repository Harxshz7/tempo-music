import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#1e1e1e',
        },
        tabBarActiveTintColor: '#1db954',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: 'Library' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="Playlists"
        component={PlaylistsScreen}
        options={{ title: 'Playlists' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

import { useResponsive } from '../hooks/useResponsive';
import DesktopSidebar from '../navigation/DesktopSidebar';
import { NeoPlayerBar } from './NeoPlayerBar';

export default function Navigation() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { isDesktop } = useResponsive();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1db954" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View className="flex-1 relative bg-neo-bg">
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen 
                name="Main" 
                component={isDesktop ? DesktopSidebar : MainTabs} 
              />
              <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
              <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
              <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: 'modal' }} />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
        
        {/* Render player bar. On desktop pinned to bottom-0, on mobile pinned above the 50px tab bar. */}
        {isAuthenticated && (
          <View className={`absolute ${isDesktop ? 'bottom-0' : 'bottom-[50px]'} w-full z-50`}>
            <NeoPlayerBar />
          </View>
        )}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
