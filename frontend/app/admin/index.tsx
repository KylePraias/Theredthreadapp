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
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { useAuthStore } from '../../src/store/authStore';

interface Organization {
  id: string;
  email: string;
  approval_status: string;
  auth_provider: string;
  is_verified: boolean;
  created_at: string;
  organization_profile: {
    name: string;
    description: string;
    contact_email: string;
    website?: string;
    areas_of_focus?: string[];
    logo?: string;
    social_links?: Record<string, string>;
  };
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  
  // Detail modal state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pending, all] = await Promise.all([
        adminApi.getPendingOrganizations(),
        adminApi.getAllOrganizations(),
      ]);
      setPendingOrgs(pending);
      setAllOrgs(all);
    } catch (error) {
      console.log('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type !== 'admin' && user?.user_type !== 'developer') {
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

  const handleViewDetails = (org: Organization) => {
    setSelectedOrg(org);
    setShowDetailModal(true);
  };

  const handleApprove = async (org: Organization) => {
    Alert.alert(
      'Approve Organization',
      `Are you sure you want to approve "${org.organization_profile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await adminApi.approveOrganization(org.id);
              fetchData();
              setShowDetailModal(false);
              Alert.alert('Success', 'Organization approved successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve organization');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (org: Organization) => {
    Alert.alert(
      'Reject Organization',
      `Are you sure you want to reject "${org.organization_profile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.rejectOrganization(org.id);
              fetchData();
              setShowDetailModal(false);
              Alert.alert('Success', 'Organization rejected');
            } catch (error) {
              Alert.alert('Error', 'Failed to reject organization');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openUrl = async (url: string) => {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    try {
      await Linking.openURL(formattedUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open URL');
    }
  };

  const renderPendingOrg = ({ item }: { item: Organization }) => (
    <TouchableOpacity 
      style={styles.orgCard}
      onPress={() => handleViewDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.orgHeader}>
        <Text style={styles.orgName}>{item.organization_profile.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 152, 0, 0.2)' }]}>
          <Text style={[styles.statusText, { color: '#ff9800' }]}>Pending</Text>
        </View>
      </View>
      <Text style={styles.orgDescription} numberOfLines={3}>
        {item.organization_profile.description}
      </Text>
      <View style={styles.orgDetails}>
        <View style={styles.orgDetail}>
          <Ionicons name="mail-outline" size={14} color="#888" />
          <Text style={styles.orgDetailText}>{item.organization_profile.contact_email}</Text>
        </View>
        {item.organization_profile.website && (
          <View style={styles.orgDetail}>
            <Ionicons name="globe-outline" size={14} color="#888" />
            <Text style={styles.orgDetailText}>{item.organization_profile.website}</Text>
          </View>
        )}
        {item.organization_profile.areas_of_focus && item.organization_profile.areas_of_focus.length > 0 && (
          <View style={styles.orgDetail}>
            <Ionicons name="pricetags-outline" size={14} color="#888" />
            <Text style={styles.orgDetailText}>
              {item.organization_profile.areas_of_focus.join(', ')}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.viewDetailsHint}>
        <Text style={styles.viewDetailsText}>Tap to view full details</Text>
        <Ionicons name="chevron-forward" size={16} color="#888" />
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={(e) => {
            e.stopPropagation();
            handleApprove(item);
          }}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={(e) => {
            e.stopPropagation();
            handleReject(item);
          }}
        >
          <Ionicons name="close" size={20} color="#f44336" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderAllOrg = ({ item }: { item: Organization }) => (
    <TouchableOpacity 
      style={styles.orgCard}
      onPress={() => handleViewDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.orgHeader}>
        <Text style={styles.orgName}>{item.organization_profile.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.approval_status)}20` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.approval_status) }]}>
            {item.approval_status.charAt(0).toUpperCase() + item.approval_status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.orgDescription} numberOfLines={2}>
        {item.organization_profile.description}
      </Text>
      <View style={styles.orgDetail}>
        <Ionicons name="mail-outline" size={14} color="#888" />
        <Text style={styles.orgDetailText}>{item.email}</Text>
      </View>
      <View style={styles.viewDetailsHint}>
        <Text style={styles.viewDetailsText}>Tap to view full details</Text>
        <Ionicons name="chevron-forward" size={16} color="#888" />
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedOrg) return null;

    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Organization Details</Text>
              <TouchableOpacity 
                onPress={() => setShowDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Organization Name */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.orgNameLarge}>{selectedOrg.organization_profile.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(selectedOrg.approval_status)}20` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrg.approval_status) }]}>
                      {selectedOrg.approval_status.charAt(0).toUpperCase() + selectedOrg.approval_status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{selectedOrg.organization_profile.description}</Text>
              </View>

              {/* Contact Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Account Email</Text>
                <TouchableOpacity 
                  style={styles.linkRow}
                  onPress={() => Linking.openURL(`mailto:${selectedOrg.email}`)}
                >
                  <Ionicons name="mail" size={16} color="#d32f2f" />
                  <Text style={styles.linkText}>{selectedOrg.email}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Public Contact Email</Text>
                <TouchableOpacity 
                  style={styles.linkRow}
                  onPress={() => Linking.openURL(`mailto:${selectedOrg.organization_profile.contact_email}`)}
                >
                  <Ionicons name="mail" size={16} color="#d32f2f" />
                  <Text style={styles.linkText}>{selectedOrg.organization_profile.contact_email}</Text>
                </TouchableOpacity>
              </View>

              {/* Website */}
              {selectedOrg.organization_profile.website && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Website</Text>
                  <TouchableOpacity 
                    style={styles.linkRow}
                    onPress={() => openUrl(selectedOrg.organization_profile.website!)}
                  >
                    <Ionicons name="globe" size={16} color="#d32f2f" />
                    <Text style={styles.linkText}>{selectedOrg.organization_profile.website}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Areas of Focus */}
              {selectedOrg.organization_profile.areas_of_focus && 
               selectedOrg.organization_profile.areas_of_focus.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Areas of Focus</Text>
                  <View style={styles.tagsContainer}>
                    {selectedOrg.organization_profile.areas_of_focus.map((area, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Social Links */}
              {selectedOrg.organization_profile.social_links && 
               Object.keys(selectedOrg.organization_profile.social_links).length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Social Links</Text>
                  {Object.entries(selectedOrg.organization_profile.social_links).map(([platform, url]) => (
                    <TouchableOpacity 
                      key={platform}
                      style={styles.linkRow}
                      onPress={() => openUrl(url as string)}
                    >
                      <Ionicons name="link" size={16} color="#d32f2f" />
                      <Text style={styles.linkText}>{platform}: {url as string}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Account Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Account Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Auth Provider:</Text>
                  <Text style={styles.infoValue}>
                    {selectedOrg.auth_provider === 'google' ? 'Google' : 'Email/Password'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email Verified:</Text>
                  <Text style={[styles.infoValue, { color: selectedOrg.is_verified ? '#4caf50' : '#f44336' }]}>
                    {selectedOrg.is_verified ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Registered:</Text>
                  <Text style={styles.infoValue}>{formatDate(selectedOrg.created_at)}</Text>
                </View>
              </View>

              {/* Action Buttons for Pending */}
              {selectedOrg.approval_status === 'pending' && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(selectedOrg)}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>Approve Organization</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(selectedOrg)}
                  >
                    <Ionicons name="close" size={20} color="#f44336" />
                    <Text style={styles.rejectButtonText}>Reject Organization</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
            <Ionicons name="shield-checkmark" size={24} color="#d32f2f" />
          </View>
          <View>
            <Text style={styles.adminTitle}>Admin Panel</Text>
            <Text style={styles.adminEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingOrgs.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {allOrgs.filter((o) => o.approval_status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{allOrgs.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingOrgs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Organizations
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'pending' ? (
        pendingOrgs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#4caf50" />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No pending organizations to review</Text>
          </View>
        ) : (
          <FlatList
            data={pendingOrgs}
            renderItem={renderPendingOrg}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" />
            }
          />
        )
      ) : (
        <FlatList
          data={allOrgs}
          renderItem={renderAllOrg}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" />
          }
        />
      )}

      {renderDetailModal()}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#d32f2f',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#d32f2f',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orgName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orgDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  orgDetails: {
    gap: 8,
    marginBottom: 12,
  },
  orgDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgDetailText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
    marginBottom: 12,
  },
  viewDetailsText: {
    color: '#888',
    fontSize: 12,
    marginRight: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 6,
  },
  rejectButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
    borderBottomWidth: 0,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orgNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  linkText: {
    color: '#d32f2f',
    fontSize: 15,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
  },
});
