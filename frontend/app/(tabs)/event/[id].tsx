import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { eventsApi } from '../../../src/api/events';
import { useAuthStore } from '../../../src/store/authStore';

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

interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRsvping, setIsRsvping] = useState(false);
  const [hasRsvpd, setHasRsvpd] = useState(false);

  useEffect(() => {
    setEvent(null);
    setRsvps([]);
    setHasRsvpd(false);
    setIsLoading(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchEventDetails();
      }
    }, [id, user?.id])
  );

  const fetchEventDetails = async () => {
    try {
      const eventData = await eventsApi.getEvent(id);
      setEvent(eventData);
      
      const rsvpData = await eventsApi.getEventRsvps(id);
      setRsvps(rsvpData);
      
      if (user) {
        setHasRsvpd(rsvpData.some((r: RSVP) => r.user_id === user.id));
      }
    } catch (error) {
      console.log('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRsvp = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to RSVP for events');
      return;
    }

    setIsRsvping(true);
    try {
      if (hasRsvpd) {
        await eventsApi.cancelRsvp(id);
        setHasRsvpd(false);
        setRsvps(rsvps.filter((r) => r.user_id !== user.id));
        if (event) {
          setEvent({ ...event, rsvp_count: event.rsvp_count - 1 });
        }
      } else {
        const newRsvp = await eventsApi.rsvpToEvent(id);
        setHasRsvpd(true);
        setRsvps([...rsvps, newRsvp]);
        if (event) {
          setEvent({ ...event, rsvp_count: event.rsvp_count + 1 });
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update RSVP';
      Alert.alert('Error', message);
    } finally {
      setIsRsvping(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleContactEmail = () => {
    if (event?.contact_email) {
      Linking.openURL(`mailto:${event.contact_email}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isUpcoming = new Date(event.date) > new Date();
  const isOwner = user?.id === event.organization_id;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{event.organization_name}</Text>
          <Text style={styles.eventName}>{event.name}</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={24} color="#d32f2f" />
            <Text style={styles.statNumber}>{event.rsvp_count}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={24} color="#d32f2f" />
            <Text style={styles.statNumber}>{formatTime(event.date)}</Text>
            <Text style={styles.statLabel}>{formatDate(event.date)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoCard}>
            <Ionicons name="location" size={24} color="#d32f2f" />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        </View>

        {event.contact_email && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity style={styles.infoCard} onPress={handleContactEmail}>
              <Ionicons name="mail" size={24} color="#d32f2f" />
              <Text style={[styles.infoText, styles.emailText]}>{event.contact_email}</Text>
            </TouchableOpacity>
          </View>
        )}

        {rsvps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendees ({rsvps.length})</Text>
            <View style={styles.attendeesList}>
              {rsvps.slice(0, 5).map((rsvp) => (
                <View key={rsvp.id} style={styles.attendeeItem}>
                  <View style={styles.attendeeAvatar}>
                    <Text style={styles.attendeeInitial}>
                      {rsvp.user_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.attendeeName}>{rsvp.user_name}</Text>
                </View>
              ))}
              {rsvps.length > 5 && (
                <Text style={styles.moreAttendees}>+{rsvps.length - 5} more</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {isUpcoming && !isOwner && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.rsvpButton, hasRsvpd && styles.cancelRsvpButton]}
            onPress={handleRsvp}
            disabled={isRsvping}
          >
            {isRsvping ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={hasRsvpd ? 'close-circle' : 'checkmark-circle'}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.rsvpButtonText}>
                  {hasRsvpd ? 'Cancel RSVP' : 'RSVP to Event'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/(tabs)/edit-event/${event.id}`)}
          >
            <Ionicons name="pencil" size={20} color="#d32f2f" />
            <Text style={styles.editButtonText}>Edit Event</Text>
          </TouchableOpacity>
        </View>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  orgName: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  eventName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  emailText: {
    color: '#d32f2f',
  },
  attendeesList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attendeeInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  attendeeName: {
    color: '#fff',
    fontSize: 15,
  },
  moreAttendees: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0c0c0c',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelRsvpButton: {
    backgroundColor: '#333',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d32f2f',
    gap: 8,
  },
  editButtonText: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: '600',
  },
});