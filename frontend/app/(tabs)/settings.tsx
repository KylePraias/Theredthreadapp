import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { InlineRoleBadge } from '../../src/components/RoleBadge';
import { COUNTRIES } from '../../src/constants/countries';
import { UPDATE_LOG, APP_VERSION, UpdateLogEntry } from '../../src/constants/updateLog';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [bugReportText, setBugReportText] = useState('');
  const [isSubmittingBugReport, setIsSubmittingBugReport] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [displayName, setDisplayName] = useState(user?.individual_profile?.display_name || '');
  const [bio, setBio] = useState(user?.individual_profile?.bio || '');
  const [country, setCountry] = useState(
    user?.individual_profile?.country || user?.organization_profile?.country || ''
  );
  const [city, setCity] = useState(
    user?.individual_profile?.city || user?.organization_profile?.city || ''
  );

  const [orgDescription, setOrgDescription] = useState(user?.organization_profile?.description || '');
  const [orgWebsite, setOrgWebsite] = useState(user?.organization_profile?.website || '');
  const [orgContactEmail, setOrgContactEmail] = useState(user?.organization_profile?.contact_email || '');
  const [orgAreasOfFocus, setOrgAreasOfFocus] = useState(
    user?.organization_profile?.areas_of_focus?.join(', ') || ''
  );

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countrySearch]);

  // Reset password form helper
  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Toggle password change with reset
  const togglePasswordChange = () => {
    if (showPasswordChange) {
      // Closing the form - reset fields
      resetPasswordForm();
    }
    setShowPasswordChange(!showPasswordChange);
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          // Logout will clear user state, and AuthGuard will redirect to welcome
          await logout();
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
      resetPasswordForm();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to change password';
      Alert.alert('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      if (user?.user_type === 'organization') {
        const areasArray = orgAreasOfFocus
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        await authApi.updateOrganizationProfile({
          description: orgDescription,
          website: orgWebsite || undefined,
          contact_email: orgContactEmail,
          areas_of_focus: areasArray,
          country: country || undefined,
          city: city || undefined,
        });
      } else {
        await authApi.updateIndividualProfile({
          display_name: displayName,
          bio: bio || undefined,
          country: country || undefined,
          city: city || undefined,
        });
      }

      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      setShowProfileEdit(false);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReportText.trim()) {
      Alert.alert('Error', 'Please describe the issue before submitting');
      return;
    }

    setIsSubmittingBugReport(true);
    try {
      await authApi.submitBugReport(bugReportText.trim());
      Alert.alert('Thank You', 'Your bug report has been submitted successfully. We appreciate your feedback!');
      setBugReportText('');
      setShowBugReport(false);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to submit bug report. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmittingBugReport(false);
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
      case 'developer':
        return 'Developer';
      case 'admin':
        return 'Administrator';
      case 'organization':
        return 'Organization';
      default:
        return 'Individual';
    }
  };

  const getUserTypeColor = () => {
    switch (user?.user_type) {
      case 'developer':
        return '#ff5722';
      case 'admin':
        return '#9c27b0';
      case 'organization':
        return '#2196f3';
      default:
        return '#d32f2f';
    }
  };

  const getLocationDisplay = () => {
    const userCountry = user?.individual_profile?.country || user?.organization_profile?.country;
    const userCity = user?.individual_profile?.city || user?.organization_profile?.city;
    
    if (userCity && userCountry) {
      return `${userCity}, ${userCountry}`;
    }
    if (userCountry) {
      return userCountry;
    }
    return 'Not set';
  };

  const isIndividualLike = user?.user_type === 'individual' || user?.user_type === 'admin' || user?.user_type === 'developer';

  const renderCountryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setCountry(item);
        setShowCountryPicker(false);
        setCountrySearch('');
      }}
    >
      <Text style={styles.countryItemText}>{item}</Text>
      {country === item && (
        <Ionicons name="checkmark" size={20} color="#d32f2f" />
      )}
    </TouchableOpacity>
  );

  const renderUpdateLogItem = ({ item }: { item: UpdateLogEntry }) => (
    <View style={styles.updateLogEntry}>
      <View style={styles.updateLogHeader}>
        <Text style={styles.updateLogVersion}>v{item.version}</Text>
        <Text style={styles.updateLogDate}>{item.date}</Text>
      </View>
      {item.changes.map((change, index) => (
        <View key={index} style={styles.changeRow}>
          <Text style={styles.changeBullet}>•</Text>
          <Text style={styles.changeText}>{change}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons
                name={user?.user_type === 'organization' ? 'people' : 'person'}
                size={40}
                color={getUserTypeColor()}
              />
            </View>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{getDisplayName()}</Text>
            <InlineRoleBadge userType={user?.user_type || 'individual'} size={20} />
          </View>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.badge, { backgroundColor: `${getUserTypeColor()}20` }]}>
            <Text style={[styles.badgeText, { color: getUserTypeColor() }]}>{getUserTypeLabel()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="location-outline" size={24} color="#888" />
              <Text style={styles.menuItemText}>Location</Text>
            </View>
            <Text style={styles.menuItemValue}>{getLocationDisplay()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowProfileEdit(!showProfileEdit)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color="#888" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons
              name={showProfileEdit ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>

          {showProfileEdit && (
            <View style={styles.editContainer}>
              {isIndividualLike ? (
                <>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your display name"
                    placeholderTextColor="#666"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#666"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Organization description"
                    placeholderTextColor="#666"
                    value={orgDescription}
                    onChangeText={setOrgDescription}
                    multiline
                    numberOfLines={4}
                  />
                  <Text style={styles.inputLabel}>Website</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com"
                    placeholderTextColor="#666"
                    value={orgWebsite}
                    onChangeText={setOrgWebsite}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>Public Contact Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="contact@organization.com"
                    placeholderTextColor="#666"
                    value={orgContactEmail}
                    onChangeText={setOrgContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputLabel}>Areas of Focus (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Education, Health, Environment"
                    placeholderTextColor="#666"
                    value={orgAreasOfFocus}
                    onChangeText={setOrgAreasOfFocus}
                  />
                </>
              )}

              {/* Country Picker */}
              <Text style={styles.inputLabel}>Country</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.pickerButtonText, !country && styles.placeholderText]}>
                  {country || 'Select Country'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>

              {/* City Input */}
              <Text style={styles.inputLabel}>City (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Your city"
                placeholderTextColor="#666"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {user?.auth_provider === 'email' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={togglePasswordChange}
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

          {(user?.user_type === 'admin' || user?.user_type === 'developer') && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#9c27b0" />
                <Text style={styles.menuItemText}>Admin Dashboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
          )}

          {user?.user_type === 'developer' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/developer' as any)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="code-slash-outline" size={24} color="#ff5722" />
                <Text style={styles.menuItemText}>Developer Settings</Text>
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
            <Text style={styles.menuItemValue}>{APP_VERSION}</Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowUpdateLog(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={24} color="#4caf50" />
              <Text style={styles.menuItemText}>Update Log</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowBugReport(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="bug-outline" size={24} color="#ff9800" />
              <Text style={styles.menuItemText}>Report a Bug</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                placeholderTextColor="#666"
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item}
              style={styles.countryList}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>

      {/* Update Log Modal */}
      <Modal
        visible={showUpdateLog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpdateLog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.updateLogModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Log</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUpdateLog(false)}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={UPDATE_LOG}
              renderItem={renderUpdateLogItem}
              keyExtractor={(item) => item.version}
              contentContainerStyle={styles.updateLogList}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        visible={showBugReport}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBugReport(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bugReportModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report a Bug</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowBugReport(false);
                  setBugReportText('');
                }}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Found an issue? Please describe what happened and how to reproduce it.
            </Text>

            <TextInput
              style={styles.bugReportInput}
              placeholder="Describe the issue..."
              placeholderTextColor="#666"
              value={bugReportText}
              onChangeText={setBugReportText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowBugReport(false);
                  setBugReportText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, !bugReportText.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmitBugReport}
                disabled={isSubmittingBugReport || !bugReportText.trim()}
              >
                {isSubmittingBugReport ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  scrollView: {
    flex: 1,
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
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
    maxWidth: 180,
    textAlign: 'right',
  },
  editContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  bugReportModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  updateLogModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  bugReportInput: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#d32f2f',
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#444',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  countryItemText: {
    color: '#fff',
    fontSize: 16,
  },
  updateLogList: {
    padding: 16,
  },
  updateLogEntry: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  updateLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  updateLogVersion: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: '600',
  },
  updateLogDate: {
    color: '#888',
    fontSize: 14,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  changeBullet: {
    color: '#4caf50',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 20,
  },
  changeText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
