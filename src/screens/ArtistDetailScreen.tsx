import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NeoText, NeoButton } from '../components/ui';

export default function ArtistDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const artistId = route.params?.artistId;

  return (
    <SafeAreaView className="flex-1 bg-neo-bg">
      <View className="flex-1 items-center justify-center p-6">
        <NeoText variant="h2" className="mb-4 text-center">Artist Details</NeoText>
        <NeoText variant="body" className="mb-8 opacity-70">Coming soon for artist: {artistId}</NeoText>
        <NeoButton label="GO BACK" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}
