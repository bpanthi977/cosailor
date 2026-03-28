import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { App } from './src/app';
import type { RootStackParamList } from './src/navigation/types';

import HomeScreen from './src/screens/HomeScreen';
import LiveConversationScreen from './src/screens/LiveConversationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppView() {
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    App.init()
      .then(() => setAppReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>DB error: {error}</Text>
      </View>
    );
  }

  if (!appReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="LiveConversation"
            component={LiveConversationScreen}
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
});
