import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet, Platform, AppState } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar';

function AuthGuard() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isInitialized && !user && ready) {
      router.replace('/welcome');
    }
  }, [user, isInitialized, ready]);

  return null;
}

export default function RootLayout() {
  const { isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const applyImmersive = () => {
        NavigationBar.setVisibilityAsync('hidden');
      };

      applyImmersive();

      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          applyImmersive();
        }
      });

      return () => subscription.remove();
    }
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" translucent />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0c0c0c' },
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="developer" options={{ headerShown: false }} />
      </Stack>
      <AuthGuard />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
});