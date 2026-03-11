import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../src/contexts/NetworkContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NoConnectionScreen() {
  const router = useRouter();
  const { isConnected, isInternetReachable, checkConnection } = useNetwork();
  const [isChecking, setIsChecking] = React.useState(false);

  // Auto-redirect when connection is restored
  useEffect(() => {
    // Check if connected and internet is reachable
    const hasInternet = isConnected === true && isInternetReachable !== false;
    
    if (hasInternet) {
      // Small delay to ensure stable connection
      const timeout = setTimeout(() => {
        router.replace('/');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, isInternetReachable, router]);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkConnection();
    setIsChecking(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline" size={80} color="#d32f2f" />
        </View>
        
        <Text style={styles.title}>No Internet Connection</Text>
        
        <Text style={styles.description}>
          Please check your internet connection and try again. The app requires an internet connection to function.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          The app will automatically reconnect when internet is available.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    minWidth: 160,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 32,
  },
});
