import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/api/client';

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

interface Event {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  description: string;
  date: string;
  location: string;
  rsvp_count: number;
}

export default function OrganizationDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleGoBack = () => {
    if (from === 'organizations') {
      router.replace('/(tabs)/organizations');
    } else {
      router.back();
    }
  };

  useEffect(() => {
    fetchOrganizationDetails();
  }, [id]);

  const fetchOrganizationDetails = async () => {
    try {
      const orgResponse = await apiClient.get(`/organizations/${id}`);
      setOrganization(orgResponse.data);

      const eventsResponse = await apiClient.get(`/organizations/${id}/events`);
      const now = new Date();
      const upcomingEvents = eventsResponse.data.filter(
        (event: Event) => new Date(event.date) > now
      );
      setEvents(upcomingEvents);
    } catch (error) {
      console.log('Error fetching organization:', error);
      Alert.alert('Error', 'Failed to load organization details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactEmail = () => {
    if (organization?.organization_profile.contact_email) {
      Linking.openURL(`mailto:${organization.organization_profile.contact_email}`);
    }
  };

  const handleWebsite = () => {
    if (organization?.organization_profile.website) {
      let url = organization.organization_profile.website;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  if (!organization) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Organization not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = organization.organization_profile;

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Ionicons name="people" size={50} color="#2196f3" />
          </View>
          <Text style={styles.orgName}>{profile.name}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.verifiedText}>Verified Organization</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{profile.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TouchableOpacity style={styles.infoCard} onPress={handleContactEmail}>
            <Ionicons name="mail" size={22} color="#d32f2f" />
            <Text style={[styles.infoText, styles.linkText]}>{profile.contact_email}</Text>
          </TouchableOpacity>

          {profile.website && (
            <TouchableOpacity style={styles.infoCard} onPress={handleWebsite}>
              <Ionicons name="globe" size={22} color="#2196f3" />
              <Text style={[styles.infoText, styles.linkText]}>{profile.website}</Text>
            </TouchableOpacity>
          )}
        </View>

        {profile.areas_of_focus && profile.areas_of_focus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas of Focus</Text>
            <View style={styles.tagsContainer}>
              {profile.areas_of_focus.map((area, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events ({events.length})</Text>
          {events.length === 0 ? (
            <View style={styles.noEventsCard}>
              <Ionicons name="calendar-outline" size={32} color="#444" />
              <Text style={styles.noEventsText}>No upcoming events</Text>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/(tabs)/event/${event.id}`)}
              >
                <Text style={styles.eventName}>{event.name}</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetail}>
                    <Ionicons name="calendar-outline" size={14} color="#888" />
                    <Text style={styles.eventDetailText}>{formatDate(event.date)}</Text>
                  </View>
                  <View style={styles.eventDetail}>
                    <Ionicons name="people-outline" size={14} color="#888" />
                    <Text style={styles.eventDetailText}>{event.rsvp_count} attending</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  orgName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedText: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 24,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  linkText: {
    color: '#2196f3',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  tag: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '500',
  },
  noEventsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  noEventsText: {
    color: '#666',
    fontSize: 15,
    marginTop: 12,
  },
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  eventName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    color: '#888',
    fontSize: 13,
  },
});