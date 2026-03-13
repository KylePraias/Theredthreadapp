import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, UserResponse } from '../../src/api/admin';
import { useAuthStore } from '../../src/store/authStore';

export default function UserManagementScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Disable modal state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [userToDisable, setUserToDisable] = useState<UserResponse | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const users = await adminApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.log('Error fetching users:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Don't do anything if user is null (logging out) - let root _layout.tsx handle redirect
    if (!user) return;
    
    if (user.user_type !== 'admin' && user.user_type !== 'developer') {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
      return () => clearTimeout(timeout);
    }
    fetchData();
  }, [user, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openDisableModal = (targetUser: UserResponse) => {
    setUserToDisable(targetUser);
    setDisableReason('');
    setShowDisableModal(true);
  };

  const handleDisableUser = async () => {
    if (!userToDisable) return;
    if (!disableReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for disabling this account');
      return;
    }

    setIsDisabling(true);
    try {
      await adminApi.disableUser(userToDisable.id, disableReason.trim());
      Alert.alert('Success', 'Account has been disabled');
      setShowDisableModal(false);
      setUserToDisable(null);
      setDisableReason('');
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to disable account';
      Alert.alert('Error', message);
    } finally {
      setIsDisabling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayName = (targetUser: UserResponse) => {
    if (targetUser.individual_profile?.display_name) {
      return targetUser.individual_profile.display_name;
    }
    if (targetUser.organization_profile?.name) {
      return targetUser.organization_profile.name;
    }
    return targetUser.email;
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'developer':
        return '#ff5722';
      case 'admin':
        return '#9c27b0';
      case 'organization':
        return '#2196f3';
      default:
        return '#888';
    }
  };

  const canDisable = (targetUser: UserResponse) => {
    // Can only disable individual and organization accounts that are not already disabled
    return (
      (targetUser.user_type === 'individual' || targetUser.user_type === 'organization') &&
      !targetUser.is_disabled
    );
  };

  const disabledCount = allUsers.filter((u) => u.is_disabled).length;

  const renderUser = ({ item }: { item: UserResponse }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{getDisplayName(item)}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.typeBadge, { backgroundColor: `${getUserTypeColor(item.user_type)}20` }]}>
            <Text style={[styles.typeText, { color: getUserTypeColor(item.user_type) }]}>
              {item.user_type.charAt(0).toUpperCase() + item.user_type.slice(1)}
            </Text>
          </View>
          {item.is_disabled && (
            <View style={styles.disabledBadge}>
              <Text style={styles.disabledText}>Disabled</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.userMeta}>
        <Text style={styles.metaText}>Joined: {formatDate(item.created_at)}</Text>
        {item.disable_count > 0 && (
          <Text style={styles.disableCount}>Disabled {item.disable_count}x</Text>
        )}
      </View>

      {item.is_disabled && item.disable_reason && (
        <View style={styles.disableReasonContainer}>
          <Text style={styles.disableReasonLabel}>Disable Reason:</Text>
          <Text style={styles.disableReasonText}>{item.disable_reason}</Text>
        </View>
      )}

      {canDisable(item) && (
        <TouchableOpacity
          style={styles.disableButton}
          onPress={() => openDisableModal(item)}
        >
          <Ionicons name="ban" size={16} color="#f44336" />
          <Text style={styles.disableButtonText}>Disable Account</Text>
        </TouchableOpacity>
      )}

      {(item.user_type === 'admin' || item.user_type === 'developer') && (
        <Text style={styles.noteText}>
          {item.user_type.charAt(0).toUpperCase() + item.user_type.slice(1)} accounts cannot be disabled
        </Text>
      )}
    </View>
  );

  const renderDisableModal = () => (
    <Modal
      visible={showDisableModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDisableModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.disableModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Disable Account</Text>
            <TouchableOpacity 
              onPress={() => setShowDisableModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {userToDisable && (
            <>
              <View style={styles.userPreview}>
                <Text style={styles.previewName}>{getDisplayName(userToDisable)}</Text>
                <Text style={styles.previewEmail}>{userToDisable.email}</Text>
                {userToDisable.disable_count > 0 && (
                  <Text style={styles.previousDisables}>
                    Previously disabled {userToDisable.disable_count} time(s)
                  </Text>
                )}
              </View>

              <Text style={styles.inputLabel}>Reason for disabling *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter the reason for disabling this account..."
                placeholderTextColor="#666"
                value={disableReason}
                onChangeText={setDisableReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.confirmDisableButton, isDisabling && styles.buttonDisabled]}
                onPress={handleDisableUser}
                disabled={isDisabling}
              >
                {isDisabling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="ban" size={20} color="#fff" />
                    <Text style={styles.confirmDisableText}>Disable Account</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDisableModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.adminInfo}>
          <View style={styles.adminAvatar}>
            <Ionicons name="people" size={24} color="#d32f2f" />
          </View>
          <View>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{allUsers.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{disabledCount}</Text>
          <Text style={styles.statLabel}>Disabled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{allUsers.length - disabledCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <FlatList
        data={allUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#444" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {renderDisableModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    color: '#d32f2f',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  // User card styles
  userCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  disabledBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disabledText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
  disableCount: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
  },
  disableReasonContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  disableReasonLabel: {
    color: '#f44336',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  disableReasonText: {
    color: '#fff',
    fontSize: 13,
  },
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    marginTop: 12,
    gap: 6,
  },
  disableButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  disableModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  userPreview: {
    backgroundColor: '#0c0c0c',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  previousDisables: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 8,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 120,
    marginBottom: 20,
  },
  confirmDisableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmDisableText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
  },
});
