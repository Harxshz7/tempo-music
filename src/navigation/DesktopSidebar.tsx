import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Disc, Search, ListMusic, Settings as SettingsIcon } from 'lucide-react-native';
import { NeoText } from '../components/ui';

import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import SettingsScreen from '../screens/SettingsScreen';

type ScreenKey = 'Library' | 'Search' | 'Playlists' | 'Settings';

interface NavItem {
  key: ScreenKey;
  label: string;
  icon: (color: string) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'Library',
    label: 'LIBRARY',
    icon: (color) => <Disc size={20} color={color} />,
  },
  {
    key: 'Search',
    label: 'SEARCH',
    icon: (color) => <Search size={20} color={color} />,
  },
  {
    key: 'Playlists',
    label: 'PLAYLISTS',
    icon: (color) => <ListMusic size={20} color={color} />,
  },
  {
    key: 'Settings',
    label: 'SETTINGS',
    icon: (color) => <SettingsIcon size={20} color={color} />,
  },
];

export default function DesktopSidebar() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('Library');

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'Library':
        return <LibraryScreen />;
      case 'Search':
        return <SearchScreen />;
      case 'Playlists':
        return <PlaylistsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      default:
        return <LibraryScreen />;
    }
  };

  return (
    <View className="flex-1 flex-row bg-neo-bg">
      {/* Left Sidebar */}
      <View className="w-64 bg-white border-r-4 border-black p-6 flex-col justify-between">
        <View>
          {/* Logo */}
          <View className="mb-8 -rotate-1">
            <NeoText className="font-space-grotesk-black text-4xl uppercase tracking-tighter">
              TEMPO
            </NeoText>
            <NeoText variant="caption" className="font-bold uppercase text-[10px] tracking-widest opacity-60 mt-0.5">
              MUSIC PLAYER
            </NeoText>
          </View>

          {/* Navigation Links */}
          <View className="gap-3">
            {NAV_ITEMS.map((item) => {
              const isActive = activeScreen === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveScreen(item.key)}
                  className={`flex-row items-center px-4 py-3.5 border-4 border-black transition-all ${
                    isActive
                      ? 'bg-neo-secondary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                      : 'bg-white hover:bg-neo-bg'
                  }`}
                >
                  <View className="mr-3">
                    {item.icon(isActive ? 'white' : 'black')}
                  </View>
                  <NeoText
                    variant="body"
                    className={`font-black uppercase tracking-wider text-sm ${
                      isActive ? 'text-white' : 'text-black'
                    }`}
                  >
                    {item.label}
                  </NeoText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Footer info in sidebar */}
        <View className="border-t-2 border-black pt-4">
          <NeoText variant="caption" className="font-bold uppercase text-[10px] opacity-40">
            Tempo Subsonic Client
          </NeoText>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 bg-neo-bg">
        {renderActiveScreen()}
      </View>
    </View>
  );
}
