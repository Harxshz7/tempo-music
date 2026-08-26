import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PlayerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Player — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#888', fontSize: 16 },
});
