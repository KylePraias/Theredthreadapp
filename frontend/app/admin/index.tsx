import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { useAuthStore } from '../../src/store/authStore';

interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  hasNotification: boolean;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingOrgsCount, setPendingOrgsCount] = useState(0);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);

  const fetchNotificationCounts = useCallback(async () => {
    try {
      const [pendingOrgs, appeals] = await Promise.all([
        adminApi.getPendingOrganizations(),
        adminApi.getAllAppeals('pending'),
      ]);
      setPendingOrgsCount(pendingOrgs.length);
      setPendingAppealsCount(appeals.length);
    } catch (error) {
      console.log('Error fetching notification counts:', error);
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
    fetchNotificationCounts();
  }, [user, fetchNotificationCounts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotificationCounts();
  };

  const menuItems: AdminMenuItem[] = [
    {
      id: 'organizations',
      title: 'Organizations',
      description: 'Approve or reject organization registrations',
      icon: 'business',
      route: '/admin/organizations',
      hasNotification: pendingOrgsCount > 0,
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: 'people',
      route: '/admin/users',
      hasNotification: false,
    },
    {
      id: 'appeals',
      title: 'Appeals',
      description: 'Review account suspension appeals',
      icon: 'document-text',
      route: '/admin/appeals',
      hasNotification: pendingAppealsCount > 0,
    },
  ];

  const renderMenuItem = (item: AdminMenuItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name={item.icon} size={28} color="#d32f2f" />
        {item.hasNotification && (
          <View style={styles.notificationDot} />
        )}
      </View>
      <Text style={styles.menuTitle}>{item.title}</Text>
      <Text style={styles.menuDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.menuArrow}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  // Create rows of 2 items each
  const rows: AdminMenuItem[][] = [];
  for (let i = 0; i < menuItems.length; i += 2) {
    rows.push(menuItems.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.adminInfo}>
          <View style={styles.adminAvatar}>
            <Ionicons name="shield-checkmark" size={24} color="#d32f2f" />
          </View>
          <View>
            <Text style={styles.adminTitle}>Admin Dashboard</Text>
            <Text style={styles.adminEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/settings')}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" />
        }
      >
        <Text style={styles.sectionTitle}>Admin Settings</Text>
        
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.menuRow}>
            {row.map((item, itemIndex) => renderMenuItem(item, rowIndex * 2 + itemIndex))}
            {/* Add empty placeholder if odd number of items in last row */}
            {row.length === 1 && <View style={styles.menuItemPlaceholder} />}
          </View>
        ))}
      </ScrollView>
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
  adminTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminEmail: {
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  menuItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 140,
    maxWidth: '48%',
  },
  menuItemPlaceholder: {
    flex: 1,
    maxWidth: '48%',
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ff9800',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  menuArrow: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
