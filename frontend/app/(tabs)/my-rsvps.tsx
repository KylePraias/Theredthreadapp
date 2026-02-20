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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi } from '../../src/api/events';

interface Event {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  description: string;
  contact_email?: string;
  date: string;
  location: string;
  rsvp_count: number;
}

interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}

interface RSVPWithEvent {
  rsvp: RSVP;
  event: Event;
}

export default function MyRsvpsScreen() {
  const router = useRouter();
  const [rsvps, setRsvps] = useState<RSVPWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRsvps = useCallback(async () => {
    try {
      const data = await eventsApi.getMyRsvps();
      setRsvps(data);
    } catch (error) {
      console.log('Error fetching RSVPs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRsvps();
  }, [fetchRsvps]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRsvps();
  };

  const handleCancelRsvp = async (eventId: string, eventName: string) => {
    Alert.alert(
      'Cancel RSVP',
      `Are you sure you want to cancel your RSVP for "${eventName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsApi.cancelRsvp(eventId);
              setRsvps(rsvps.filter((r) => r.event.id !== eventId));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to cancel RSVP');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  const renderRsvp = ({ item }: { item: RSVPWithEvent }) => {
    const upcoming = isUpcoming(item.event.date);
    
    return (
      <TouchableOpacity
        style={[styles.eventCard, !upcoming && styles.pastEventCard]}
        onPress={() => router.push(`/(tabs)/event/${item.event.id}`)}
      >
        {!upcoming && (
          <View style={styles.pastBadge}>
            <Text style={styles.pastBadgeText}>Past Event</Text>
          </View>
        )}
        <View style={styles.eventHeader}>
          <Text style={styles.orgName}>{item.event.organization_name}</Text>
          <View style={styles.rsvpBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.rsvpStatus}>RSVP'd</Text>
          </View>
        </View>
        <Text style={styles.eventName}>{item.event.name}</Text>
        <View style={styles.eventFooter}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar-outline" size={16} color="#888" />
            <Text style={styles.eventDetailText}>{formatDate(item.event.date)}</Text>
          </View>
          <View style={styles.eventDetail}>
            <Ionicons name="location-outline" size={16} color="#888" />
            <Text style={styles.eventDetailText} numberOfLines={1}>
              {item.event.location}
            </Text>
          </View>
        </View>
        {upcoming && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRsvp(item.event.id, item.event.name)}
          >
            <Text style={styles.cancelButtonText}>Cancel RSVP</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
      {rsvps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>No RSVPs yet</Text>
          <Text style={styles.emptySubtext}>
            Browse events and RSVP to join the action
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rsvps}
          renderItem={renderRsvp}
          keyExtractor={(item) => item.rsvp.id}
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
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  pastEventCard: {
    opacity: 0.7,
  },
  pastBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pastBadgeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orgName: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '500',
  },
  rsvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpStatus: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '500',
  },
  eventName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventFooter: {
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
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
  browseButton: {
    marginTop: 24,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});