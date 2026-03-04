import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  is_active: boolean;
}

export default function MyEventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const data = await eventsApi.getOrganizationEvents(user.id);
      setEvents(data);
    } catch (error) {
      console.log('Error fetching events:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Refresh data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsApi.deleteEvent(eventId);
              setEvents(events.filter((e) => e.id !== eventId));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete event');
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

  const renderEvent = ({ item }: { item: Event }) => {
    const upcoming = isUpcoming(item.date);
    
    return (
      <View style={[styles.eventCard, !upcoming && styles.pastEventCard]}>
        {!upcoming && (
          <View style={styles.pastBadge}>
            <Text style={styles.pastBadgeText}>Past</Text>
          </View>
        )}
        <View style={styles.eventHeader}>
          <View style={styles.rsvpBadge}>
            <Ionicons name="people" size={16} color="#d32f2f" />
            <Text style={styles.rsvpCount}>{item.rsvp_count} RSVPs</Text>
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
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push({
              pathname: '/(tabs)/event/[id]',
              params: { id: item.id, from: 'my-events' }
            })}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          {upcoming && (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push({
                  pathname: '/(tabs)/edit-event/[id]',
                  params: { id: item.id, from: 'my-events' }
                })}
              >
                <Ionicons name="pencil-outline" size={18} color="#d32f2f" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteEvent(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#f44336" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/create-event')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create New Event</Text>
      </TouchableOpacity>

      {events.length === 0 ? (
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
          <Ionicons name="megaphone-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>No events yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first event to start organizing
          </Text>
        </ScrollView>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  rsvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    gap: 6,
  },
  editButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
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