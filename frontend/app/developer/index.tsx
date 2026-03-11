import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { developerApi, UserResponse } from '../../src/api/developer';
import { useAuthStore } from '../../src/store/authStore';
import { InlineRoleBadge } from '../../src/components/RoleBadge';

export default function DeveloperScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Only redirect if user exists but is not a developer
    // Don't redirect if user is null (logging out) - let AuthGuard handle that
    if (user && user.user_type !== 'developer') {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
      return () => clearTimeout(timeout);
    }
    if (user?.user_type === 'developer') {
      loadAllUsers();
    }
  }, [user]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await developerApi.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.log('Error loading users:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAllUsers();
      return;
    }
    
    setIsSearching(true);
    try {
      const result = await developerApi.searchUsers(searchQuery);
      setUsers(result.users);
    } catch (error) {
      console.log('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignRole = async (targetUser: UserResponse, newRole: 'admin' | 'individual') => {
    const roleName = newRole === 'admin' ? 'Admin' : 'Individual';
    Alert.alert(
      'Assign Role',
      `Are you sure you want to change ${targetUser.email}'s role to ${roleName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await developerApi.assignUserRole(targetUser.id, newRole);
              Alert.alert('Success', `User role changed to ${roleName}`);
              if (searchQuery.trim()) {
                handleSearch();
              } else {
                loadAllUsers();
              }
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Failed to assign role';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      loadAllUsers();
    }
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

  const getRoleColor = (userType: string) => {
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

  const renderUser = ({ item }: { item: UserResponse }) => {
    const canChangeRole = item.user_type !== 'developer' && item.user_type !== 'organization';
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{getDisplayName(item)}</Text>
              <InlineRoleBadge userType={item.user_type as any} size={18} />
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: `${getRoleColor(item.user_type)}20` },
            ]}
          >
            <Text style={[styles.roleText, { color: getRoleColor(item.user_type) }]}>
              {item.user_type.charAt(0).toUpperCase() + item.user_type.slice(1)}
            </Text>
          </View>
        </View>
        
        {canChangeRole && (
          <View style={styles.actionButtons}>
            {item.user_type !== 'admin' && (
              <TouchableOpacity
                style={styles.makeAdminButton}
                onPress={() => handleAssignRole(item, 'admin')}
              >
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
                <Text style={styles.buttonText}>Make Admin</Text>
              </TouchableOpacity>
            )}
            {item.user_type === 'admin' && (
              <TouchableOpacity
                style={styles.removeAdminButton}
                onPress={() => handleAssignRole(item, 'individual')}
              >
                <Ionicons name="person" size={16} color="#f44336" />
                <Text style={styles.removeButtonText}>Remove Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {item.user_type === 'organization' && (
          <Text style={styles.noteText}>Organization roles cannot be changed</Text>
        )}
        {item.user_type === 'developer' && (
          <Text style={styles.noteText}>Developer accounts cannot be modified</Text>
        )}
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.developerInfo}>
          <View style={styles.developerAvatar}>
            <Ionicons name="code-slash" size={24} color="#ff5722" />
          </View>
          <View>
            <Text style={styles.developerTitle}>Developer Panel</Text>
            <Text style={styles.developerEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/settings')}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by email or name..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                loadAllUsers();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {users.length} user{users.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={users}
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
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />
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
  developerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  developerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  developerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  developerEmail: {
    color: '#888',
    fontSize: 13,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statsText: {
    color: '#888',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  makeAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9c27b0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  removeAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});