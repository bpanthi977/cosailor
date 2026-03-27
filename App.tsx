import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { initDb } from './src/db/schema';
import HomeScreen from './src/screens/HomeScreen';
import { makeOpenrouterProvider } from './src/ai/openrouterProvider';
import type { AIProvider } from './src/ai/types';

class _App {
  private static ai: AIProvider | null = null;

  static init() {
    const client = createOpenRouter({
      apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
    });
    _App.ai = makeOpenrouterProvider(client);
  }

  static getAI(): AIProvider {
    if (!_App.ai) throw new Error('App.init() not called');
    return _App.ai;
  }
}

export { _App as App };

const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    _App.init();
    initDb()
      .then(() => setDbReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>DB error: {error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
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
