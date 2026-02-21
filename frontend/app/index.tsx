import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    // Only auto-redirect if user is logged in when screen first loads
    // Don't redirect if user just logged out (user becomes null)
    if (isInitialized && user) {
      // Route based on user type and status
      if (user.user_type === 'organization' && user.approval_status === 'pending') {
        router.replace('/(auth)/pending-approval');
      } else if (user.user_type === 'organization' && user.approval_status === 'rejected') {
        router.replace('/(auth)/rejected');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isInitialized]); // Only depend on isInitialized, not user - so it only runs on initial load

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-circle" size={100} color="#d32f2f" />
        <Text style={styles.title}>Red Thread</Text>
        <Text style={styles.subtitle}>Mutual Aid & Event Organizing</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.tagline}>Connect. Organize. Act.</Text>
        <Text style={styles.description}>
          Join a community of organizers and activists working together for change.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/signup-type')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: 40,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d32f2f',
  },
  secondaryButtonText: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: '600',
  },
});