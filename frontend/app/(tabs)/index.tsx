import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
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
  latitude?: number;
  longitude?: number;
  rsvp_count: number;
  created_at: string;
  distance?: number; // Calculated distance in km
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'signups' | 'distance'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Location and distance filter state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // null means no filter
  const [tempMaxDistance, setTempMaxDistance] = useState<number>(50); // temp value for slider

  // Request location permission and get user location
  const requestLocationPermission = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        return true;
      } else {
        Alert.alert(
          'Location Permission Denied',
          'To filter events by distance, please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
        setLocationPermission(false);
        return false;
      }
    } catch (error) {
      console.log('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
      return false;
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Calculate distances and filter events
  const applyDistanceFilter = useCallback((eventsToFilter: Event[]) => {
    if (!userLocation) {
      setFilteredEvents(eventsToFilter);
      return;
    }

    // Add distance to each event
    const eventsWithDistance = eventsToFilter.map((event) => {
      if (event.latitude && event.longitude) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.latitude,
          event.longitude
        );
        return { ...event, distance };
      }
      return { ...event, distance: undefined };
    });

    // Filter by max distance if set
    let filtered = eventsWithDistance;
    if (maxDistance !== null) {
      filtered = eventsWithDistance.filter(
        (event) => event.distance !== undefined && event.distance <= maxDistance
      );
    }

    // Sort by distance if selected
    if (sortBy === 'distance') {
      filtered = [...filtered].sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
      });
    }

    setFilteredEvents(filtered);
  }, [userLocation, maxDistance, sortBy, sortOrder]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await eventsApi.getEvents(sortBy === 'distance' ? 'date' : sortBy, sortOrder, true);
      setEvents(data);
      applyDistanceFilter(data);
    } catch (error) {
      console.log('Error fetching events:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, sortOrder, applyDistanceFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [sortBy, sortOrder])
  );

  // Re-apply distance filter when userLocation or maxDistance changes
  useEffect(() => {
    applyDistanceFilter(events);
  }, [userLocation, maxDistance, events, applyDistanceFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const toggleSort = (type: 'date' | 'signups' | 'distance') => {
    if (type === 'distance' && !userLocation) {
      // Request location first
      requestLocationPermission().then((success) => {
        if (success) {
          setSortBy('distance');
          setSortOrder('asc');
        }
      });
      return;
    }
    
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder(type === 'date' ? 'asc' : type === 'distance' ? 'asc' : 'desc');
    }
  };

  const handleOpenDistanceFilter = async () => {
    if (!userLocation) {
      const success = await requestLocationPermission();
      if (!success) return;
    }
    setTempMaxDistance(maxDistance || 50);
    setShowDistanceFilter(true);
  };

  const applyDistanceFilterModal = () => {
    setMaxDistance(tempMaxDistance);
    setShowDistanceFilter(false);
  };

  const clearDistanceFilter = () => {
    setMaxDistance(null);
    setShowDistanceFilter(false);
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

  const formatDistance = (distance: number | undefined) => {
    if (distance === undefined) return 'N/A';
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push({
        pathname: '/(tabs)/event/[id]',
        params: { id: item.id, from: 'events' }
      })}
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
        {userLocation && item.distance !== undefined && (
          <View style={styles.eventDetail}>
            <Ionicons name="navigate-outline" size={16} color="#d32f2f" />
            <Text style={[styles.eventDetailText, { color: '#d32f2f' }]}>
              {formatDistance(item.distance)}
            </Text>
          </View>
        )}
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
        <Text style={styles.sortLabel}>Sort:</Text>
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
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
          onPress={() => toggleSort('distance')}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#d32f2f" />
          ) : (
            <>
              <Ionicons name="navigate-outline" size={14} color={sortBy === 'distance' ? '#d32f2f' : '#888'} />
              <Text style={[styles.sortButtonText, sortBy === 'distance' && styles.sortButtonTextActive]}>
                Near
              </Text>
              {sortBy === 'distance' && (
                <Ionicons
                  name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color="#d32f2f"
                />
              )}
            </>
          )}
        </TouchableOpacity>
        
        {/* Distance Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, maxDistance !== null && styles.filterButtonActive]}
          onPress={handleOpenDistanceFilter}
        >
          <Ionicons 
            name="options-outline" 
            size={18} 
            color={maxDistance !== null ? '#d32f2f' : '#888'} 
          />
          {maxDistance !== null && (
            <Text style={styles.filterBadge}>{maxDistance}km</Text>
          )}
        </TouchableOpacity>
      </View>

      {filteredEvents.length === 0 ? (
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
          <Ionicons name="calendar-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>
            {maxDistance !== null ? 'No events within distance' : 'No upcoming events'}
          </Text>
          <Text style={styles.emptySubtext}>
            {maxDistance !== null 
              ? `Try increasing the distance filter (currently ${maxDistance}km)`
              : 'Check back later for new events'}
          </Text>
          {maxDistance !== null && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={clearDistanceFilter}>
              <Text style={styles.clearFilterText}>Clear Distance Filter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredEvents}
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

      {/* Distance Filter Modal */}
      <Modal
        visible={showDistanceFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDistanceFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Distance</Text>
              <TouchableOpacity onPress={() => setShowDistanceFilter(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.distanceLabel}>
              Maximum Distance: <Text style={styles.distanceValue}>{tempMaxDistance} km</Text>
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={200}
              step={1}
              value={tempMaxDistance}
              onValueChange={setTempMaxDistance}
              minimumTrackTintColor="#d32f2f"
              maximumTrackTintColor="#333"
              thumbTintColor="#d32f2f"
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <Text style={styles.sliderLabel}>200 km</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.clearButton} onPress={clearDistanceFilter}>
                <Text style={styles.clearButtonText}>Clear Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyDistanceFilterModal}>
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sortLabel: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
    marginRight: 6,
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
    marginLeft: 'auto',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
  },
  filterBadge: {
    color: '#d32f2f',
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    gap: 6,
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
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clearFilterButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
    borderRadius: 12,
  },
  clearFilterText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  distanceLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  distanceValue: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  sliderLabel: {
    color: '#666',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
