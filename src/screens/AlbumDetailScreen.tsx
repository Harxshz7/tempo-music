import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NeoText, NeoButton } from '../components/ui';

export default function AlbumDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const albumId = route.params?.albumId;

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className="flex-1 items-center justify-center p-6">
        <NeoText variant="h2" className="mb-4 text-center">Album Details</NeoText>
        <NeoText variant="body" className="mb-8 opacity-70">Coming soon for album: {albumId}</NeoText>
        <NeoButton label="GO BACK" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}
