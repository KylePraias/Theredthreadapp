import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // Small delay to ensure state is cleared before navigation
          setTimeout(() => {
            router.replace('/');
          }, 100);
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    // Password validation
    const hasMinLength = newPassword.length >= 8;
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasMinLength || !hasNumber || !hasSpecialChar) {
      Alert.alert('Error', 'Password must be at least 8 characters with a number and special character');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to change password';
      Alert.alert('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getDisplayName = () => {
    if (user?.individual_profile) {
      return user.individual_profile.display_name;
    }
    if (user?.organization_profile) {
      return user.organization_profile.name;
    }
    return user?.email || 'User';
  };

  const getUserTypeLabel = () => {
    switch (user?.user_type) {
      case 'admin':
        return 'Administrator';
      case 'organization':
        return 'Organization';
      default:
        return 'Individual';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons
              name={user?.user_type === 'organization' ? 'people' : 'person'}
              size={40}
              color="#d32f2f"
            />
          </View>
        </View>
        <Text style={styles.displayName}>{getDisplayName()}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{getUserTypeLabel()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {user?.auth_provider === 'email' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowPasswordChange(!showPasswordChange)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed-outline" size={24} color="#888" />
              <Text style={styles.menuItemText}>Change Password</Text>
            </View>
            <Ionicons
              name={showPasswordChange ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        )}

        {showPasswordChange && (
          <View style={styles.passwordChangeContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Current Password"
              placeholderTextColor="#666"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm New Password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.changePasswordButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {user?.user_type === 'admin' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#888" />
              <Text style={styles.menuItemText}>Admin Dashboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {user?.organization_profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user.organization_profile.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>{user.organization_profile.contact_email}</Text>
            </View>
            {user.organization_profile.website && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Website</Text>
                <Text style={styles.infoValue}>{user.organization_profile.website}</Text>
              </View>
            )}
            {user.organization_profile.areas_of_focus && user.organization_profile.areas_of_focus.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Focus Areas</Text>
                <Text style={styles.infoValue}>
                  {user.organization_profile.areas_of_focus.join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={24} color="#888" />
            <Text style={styles.menuItemText}>Version</Text>
          </View>
          <Text style={styles.menuItemValue}>1.0.0</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#f44336" />
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
  menuItemValue: {
    color: '#888',
    fontSize: 14,
  },
  passwordChangeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  passwordInput: {
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  changePasswordButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
});