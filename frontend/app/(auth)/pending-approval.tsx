import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { logout, user, refreshUser } = useAuthStore();

  const handleCheckStatus = async () => {
    await refreshUser();
    if (user?.approval_status === 'approved') {
      router.replace('/(tabs)');
    } else if (user?.approval_status === 'rejected') {
      router.replace('/(auth)/rejected');
    }
  };

  const handleLogout = async () => {
    await logout();
    // Explicitly navigate to welcome page after logout
    setTimeout(() => {
      router.replace('/welcome');
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time" size={60} color="#ff9800" />
        </View>
        <Text style={styles.title}>Pending Approval</Text>
        <Text style={styles.message}>
          Your organization registration is being reviewed by our admin team.
        </Text>
        <Text style={styles.subMessage}>
          We'll notify you once your account has been approved. This usually takes 1-2 business days.
        </Text>

        {user?.organization_profile && (
          <View style={styles.orgInfo}>
            <Text style={styles.orgLabel}>Organization</Text>
            <Text style={styles.orgName}>{user.organization_profile.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.checkButton} onPress={handleCheckStatus}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.checkButtonText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  orgInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  orgLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  orgName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  checkButton: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  logoutButtonText: {
    color: '#888',
    fontSize: 16,
  },
});