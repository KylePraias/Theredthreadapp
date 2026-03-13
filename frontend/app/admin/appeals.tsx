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
import { adminApi, AppealResponse } from '../../src/api/admin';
import { useAuthStore } from '../../src/store/authStore';

export default function AppealsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [appeals, setAppeals] = useState<AppealResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'all' | 'approved' | 'denied'>('pending');
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealResponse | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve');

  const fetchAppeals = useCallback(async () => {
    try {
      const status = activeFilter === 'all' ? undefined : activeFilter;
      const data = await adminApi.getAllAppeals(status);
      setAppeals(data);
    } catch (error) {
      console.log('Error fetching appeals:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    // Don't do anything if user is null (logging out) - let root _layout.tsx handle redirect
    if (!user) return;
    
    if (user.user_type !== 'admin' && user.user_type !== 'developer') {
      const timeout = setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
      return () => clearTimeout(timeout);
    }
    fetchAppeals();
  }, [user, fetchAppeals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppeals();
  };

  const openReviewModal = (appeal: AppealResponse, action: 'approve' | 'deny') => {
    setSelectedAppeal(appeal);
    setReviewAction(action);
    setAdminResponse('');
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (!selectedAppeal) return;

    setIsProcessing(true);
    try {
      if (reviewAction === 'approve') {
        await adminApi.approveAppeal(selectedAppeal.id, adminResponse.trim() || undefined);
        Alert.alert('Success', 'Appeal approved and account has been re-enabled. An email notification has been sent.');
      } else {
        await adminApi.denyAppeal(selectedAppeal.id, adminResponse.trim() || undefined);
        Alert.alert('Success', 'Appeal denied. The account remains disabled. An email notification has been sent.');
      }
      setShowReviewModal(false);
      setSelectedAppeal(null);
      setAdminResponse('');
      fetchAppeals();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to process appeal';
      Alert.alert('Error', message);
    } finally {
      setIsProcessing(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'denied':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  const pendingCount = appeals.filter(a => a.status === 'pending').length;

  const renderAppeal = ({ item }: { item: AppealResponse }) => (
    <View style={styles.appealCard}>
      <View style={styles.appealHeader}>
        <View>
          <Text style={styles.userName}>{item.user_name}</Text>
          <Text style={styles.userEmail}>{item.user_email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Disable Reason (by Admin)</Text>
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>{item.disable_reason}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>User's Appeal</Text>
        <View style={styles.appealBox}>
          <Text style={styles.appealText}>{item.appeal_message}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Disable #{item.disable_instance} • Submitted {formatDate(item.created_at)}
        </Text>
      </View>

      {item.status === 'pending' ? (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => openReviewModal(item, 'approve')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => openReviewModal(item, 'deny')}
          >
            <Ionicons name="close-circle" size={20} color="#f44336" />
            <Text style={styles.denyButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.reviewedInfo}>
          <Text style={styles.reviewedLabel}>
            {item.status === 'approved' ? 'Approved' : 'Denied'} on {formatDate(item.reviewed_at || '')}
          </Text>
          {item.admin_response && (
            <View style={styles.adminResponseBox}>
              <Text style={styles.adminResponseLabel}>Admin Response:</Text>
              <Text style={styles.adminResponseText}>{item.admin_response}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {reviewAction === 'approve' ? 'Approve Appeal' : 'Deny Appeal'}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowReviewModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {selectedAppeal && (
            <>
              <View style={styles.userPreview}>
                <Text style={styles.previewName}>{selectedAppeal.user_name}</Text>
                <Text style={styles.previewEmail}>{selectedAppeal.user_email}</Text>
              </View>

              <Text style={styles.warningText}>
                {reviewAction === 'approve' 
                  ? 'This will re-enable the user\'s account and allow them to log in again.'
                  : 'The user\'s account will remain disabled. They will not be able to submit another appeal for this disable instance.'}
              </Text>

              <Text style={styles.inputLabel}>Response to user (optional)</Text>
              <TextInput
                style={styles.responseInput}
                placeholder="Add a message that will be included in the email notification..."
                placeholderTextColor="#666"
                value={adminResponse}
                onChangeText={setAdminResponse}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  reviewAction === 'approve' ? styles.approveConfirm : styles.denyConfirm,
                  isProcessing && styles.buttonDisabled
                ]}
                onPress={handleReview}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={reviewAction === 'approve' ? 'checkmark-circle' : 'close-circle'} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={styles.confirmText}>
                      {reviewAction === 'approve' ? 'Approve & Re-enable Account' : 'Deny Appeal'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReviewModal(false)}
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
            <Ionicons name="document-text" size={24} color="#d32f2f" />
          </View>
          <View>
            <Text style={styles.adminTitle}>Appeals</Text>
            <Text style={styles.adminEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'pending' && styles.activeFilter]}
          onPress={() => setActiveFilter('pending')}
        >
          <Text style={[styles.filterText, activeFilter === 'pending' && styles.activeFilterText]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'approved' && styles.activeFilter]}
          onPress={() => setActiveFilter('approved')}
        >
          <Text style={[styles.filterText, activeFilter === 'approved' && styles.activeFilterText]}>
            Approved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'denied' && styles.activeFilter]}
          onPress={() => setActiveFilter('denied')}
        >
          <Text style={[styles.filterText, activeFilter === 'denied' && styles.activeFilterText]}>
            Denied
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {appeals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={activeFilter === 'pending' ? 'checkmark-circle' : 'document-text-outline'} 
            size={60} 
            color={activeFilter === 'pending' ? '#4caf50' : '#444'} 
          />
          <Text style={styles.emptyText}>
            {activeFilter === 'pending' ? 'No pending appeals' : 'No appeals found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeFilter === 'pending' 
              ? 'All appeals have been reviewed'
              : 'Appeals will appear here when users submit them'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={appeals}
          renderItem={renderAppeal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d32f2f" />
          }
        />
      )}

      {renderReviewModal()}
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
  adminTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminEmail: {
    color: '#888',
    fontSize: 13,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFilter: {
    backgroundColor: '#d32f2f',
    borderColor: '#d32f2f',
  },
  filterText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  appealCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  reasonBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  reasonText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  appealBox: {
    backgroundColor: '#0c0c0c',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  appealText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    marginBottom: 16,
  },
  metaText: {
    color: '#666',
    fontSize: 12,
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
  denyButton: {
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
  denyButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewedInfo: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  reviewedLabel: {
    color: '#888',
    fontSize: 12,
  },
  adminResponseBox: {
    backgroundColor: '#0c0c0c',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  adminResponseLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  adminResponseText: {
    color: '#fff',
    fontSize: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
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
    marginBottom: 16,
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
  warningText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  responseInput: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
    marginBottom: 20,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveConfirm: {
    backgroundColor: '#4caf50',
  },
  denyConfirm: {
    backgroundColor: '#f44336',
  },
  confirmText: {
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
