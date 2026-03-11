import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface OrganizationProfile {
  name: string;
  description: string;
  contact_email: string;
  website?: string;
  areas_of_focus?: string[];
  logo?: string;
}

interface Organization {
  id: string;
  email: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  approval_status: string;
  organization_profile: OrganizationProfile;
  created_at: string;
}

export default function OrganizationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    // Don't fetch if user is not logged in
    if (!user) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      const response = await apiClient.get('/organizations');
      setOrganizations(response.data);
    } catch (error) {
      console.log('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchOrganizations();
      }
    }, [user, fetchOrganizations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizations();
  };

  const renderOrganization = ({ item }: { item: Organization }) => (
    <TouchableOpacity
      style={styles.orgCard}
      onPress={() => router.push({
        pathname: '/(tabs)/organization/[id]',
        params: { id: item.id, from: 'organizations' }
      })}
    >
      <View style={styles.orgHeader}>
        <View style={styles.orgAvatar}>
          <Ionicons name="people" size={28} color="#2196f3" />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{item.organization_profile.name}</Text>
          <Text style={styles.orgEmail}>{item.organization_profile.contact_email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#888" />
      </View>

      <Text style={styles.orgDescription} numberOfLines={2}>
        {item.organization_profile.description}
      </Text>

      {item.organization_profile.areas_of_focus && item.organization_profile.areas_of_focus.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.organization_profile.areas_of_focus.slice(0, 3).map((area, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{area}</Text>
            </View>
          ))}
          {item.organization_profile.areas_of_focus.length > 3 && (
            <Text style={styles.moreAreas}>
              +{item.organization_profile.areas_of_focus.length - 3} more
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
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
      {organizations.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d32f2f"
            />
          }
        >
          <Ionicons name="people-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>No organizations yet</Text>
          <Text style={styles.emptySubtext}>
            Organizations will appear here once they sign up
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={organizations}
          renderItem={renderOrganization}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d32f2f"
            />
          }
        />
      )}
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
  listContent: {
    padding: 16,
  },
  orgCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  orgEmail: {
    color: '#888',
    fontSize: 13,
  },
  orgDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
  },
  moreAreas: {
    color: '#666',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
    textAlign: 'center',
  },
});