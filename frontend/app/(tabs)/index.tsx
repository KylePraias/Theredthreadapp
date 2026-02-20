import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi } from '../../src/api/events';
import { useAuthStore } from '../../src/store/authStore';

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
  created_at: string;
}

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'signups'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchEvents = useCallback(async () => {
    try {
      const data = await eventsApi.getEvents(sortBy, sortOrder, true);
      setEvents(data);
    } catch (error) {
      console.log('Error fetching events:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const toggleSort = (type: 'date' | 'signups') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder(type === 'date' ? 'asc' : 'desc');
    }
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

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/(tabs)/event/${item.id}`)}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.orgName}>{item.organization_name}</Text>
        <View style={styles.rsvpBadge}>
          <Ionicons name="people" size={14} color="#d32f2f" />
          <Text style={styles.rsvpCount}>{item.rsvp_count}</Text>
        </View>
      </View>
      <Text style={styles.eventName}>{item.name}</Text>
      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.eventFooter}>
        <View style={styles.eventDetail}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.eventDetailText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.eventDetail}>
          <Ionicons name="location-outline" size={16} color="#888" />
          <Text style={styles.eventDetailText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
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

  return (
    <View style={styles.container}>
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
          onPress={() => toggleSort('date')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
            Date
          </Text>
          {sortBy === 'date' && (
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color="#d32f2f"
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'signups' && styles.sortButtonActive]}
          onPress={() => toggleSort('signups')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'signups' && styles.sortButtonTextActive]}>
            Signups
          </Text>
          {sortBy === 'signups' && (
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color="#d32f2f"
            />
          )}
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>No upcoming events</Text>
          <Text style={styles.emptySubtext}>Check back later for new events</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
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
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sortLabel: {
    color: '#888',
    fontSize: 14,
    marginRight: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
    marginRight: 8,
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
  },
  sortButtonText: {
    color: '#888',
    fontSize: 13,
  },
  sortButtonTextActive: {
    color: '#d32f2f',
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
  rsvpCount: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
  },
  eventName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
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