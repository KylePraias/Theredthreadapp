import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignupTypeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How would you like to join?</Text>
        <Text style={styles.subtitle}>Choose the type of account that best fits you</Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(auth)/individual-signup')}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="person" size={40} color="#d32f2f" />
          </View>
          <Text style={styles.optionTitle}>Individual</Text>
          <Text style={styles.optionDescription}>
            Join as an individual to discover events, RSVP, and connect with organizations in your community.
          </Text>
          <View style={styles.optionBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.optionBadgeText}>Instant Access</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/(auth)/organization-signup')}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="people" size={40} color="#d32f2f" />
          </View>
          <Text style={styles.optionTitle}>Organization</Text>
          <Text style={styles.optionDescription}>
            Register your organization to create events, recruit volunteers, and build community power.
          </Text>
          <View style={styles.optionBadge}>
            <Ionicons name="time" size={16} color="#ff9800" />
            <Text style={styles.optionBadgeText}>Requires Approval</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.footerLink}>Sign In</Text>
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
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 16,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionBadgeText: {
    fontSize: 13,
    color: '#888',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
    gap: 8,
  },
  footerText: {
    color: '#888',
    fontSize: 16,
  },
  footerLink: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
});