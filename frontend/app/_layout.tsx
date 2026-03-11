import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet, Platform, AppState, BackHandler } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar';
import { NetworkProvider, useNetwork } from '../src/contexts/NetworkContext';

function NetworkGuard() {
  const { isConnected, isInternetReachable } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for network status to be determined
    if (isConnected === null) return;

    // Check if there's no internet connection
    const hasNoInternet = isConnected === false || isInternetReachable === false;
    
    // If no internet and not already on the no-connection page, redirect once
    if (hasNoInternet && pathname !== '/no-connection' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/no-connection');
    }
    
    // Reset flag when internet is back
    if (!hasNoInternet) {
      hasRedirected.current = false;
    }
  }, [isConnected, isInternetReachable, pathname, router]);

  return null;
}

function AuthGuard() {
  const { user, isInitialized, isLoggingOut } = useAuthStore();
  const { isConnected, isInternetReachable } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const previousUser = useRef(user);

  // List of public paths that don't require authentication
  const publicPaths = ['/welcome', '/no-connection', '/(auth)', '/login', '/individual-signup', '/organization-signup', '/forgot-password', '/verify-email'];
  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path) || pathname === path);

  useEffect(() => {
    // Don't redirect if no internet (NetworkGuard handles this)
    const hasNoInternet = isConnected === false || isInternetReachable === false;
    if (hasNoInternet) return;

    // Don't redirect while still initializing
    if (!isInitialized) return;

    // Detect logout: user was logged in, now logged out
    const justLoggedOut = previousUser.current !== null && user === null;
    
    // Update previous user ref
    previousUser.current = user;

    // If user just logged out or has no user on protected path, redirect once
    if (!user && !isPublicPath && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/welcome');
      return;
    }
    
    // Reset flag when user logs in
    if (user) {
      hasRedirected.current = false;
    }
  }, [user, isInitialized, isConnected, isInternetReachable, pathname, isPublicPath]);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If on no-connection page, exit app
      if (pathname === '/no-connection') {
        BackHandler.exitApp();
        return true;
      }

      // If user is not logged in and on welcome page, exit app
      if (!user && (pathname === '/welcome' || pathname === '/')) {
        BackHandler.exitApp();
        return true;
      }

      // If on main tabs (index pages), don't go back further
      if (pathname === '/' || pathname === '/index' || pathname === '/(tabs)' || pathname === '/(tabs)/index') {
        return true;
      }

      return false;
    });

    return () => backHandler.remove();
  }, [user, pathname]);

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
      <NetworkProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <StatusBar style="light" />
        </View>
      </NetworkProvider>
    );
  }

  return (
    <NetworkProvider>
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
        <Stack.Screen name="no-connection" options={{ headerShown: false }} />
      </Stack>
      <NetworkGuard />
      <AuthGuard />
    </NetworkProvider>
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
