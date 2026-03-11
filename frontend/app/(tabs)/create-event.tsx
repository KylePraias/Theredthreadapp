import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventsApi } from '../../src/api/events';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface PlacePrediction {
  place_id: string;
  description: string;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Location search state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form function
  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setContactEmail('');
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowLocationModal(false);
    setLocationSearch('');
    setPredictions([]);
  }, []);

  // Reset form when screen loses focus (user navigates away)
  useFocusEffect(
    useCallback(() => {
      // Called when screen is focused
      return () => {
        // Called when screen is unfocused (navigating away)
        resetForm();
      };
    }, [resetForm])
  );

  const handleCreate = async () => {
    if (!name || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (date <= new Date()) {
      Alert.alert('Error', 'Event date must be in the future');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (contactEmail && !emailRegex.test(contactEmail)) {
      Alert.alert('Error', 'Please enter a valid contact email or leave it blank');
      return;
    }

    setIsLoading(true);
    try {
      await eventsApi.createEvent({
        name,
        description,
        contact_email: contactEmail || undefined,
        date: date.toISOString(),
        location,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });
      
      // Reset form after successful creation
      resetForm();
      
      Alert.alert('Success', 'Event created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create event';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  // Search for places using Google Places API
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3 || !GOOGLE_MAPS_API_KEY) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify({ input: query }),
        }
      );
      const data = await response.json();
      if (data.suggestions) {
        setPredictions(data.suggestions.map((s: any) => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text.text,
        })));
      }
    } catch (error) {
      console.log('Error searching places:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSearchChange = (text: string) => {
    setLocationSearch(text);
    
    // Debounce the search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  // Get place details (lat/lng) when a place is selected
  const selectPlace = async (prediction: PlacePrediction) => {
  setLocation(prediction.description);
  setShowLocationModal(false);
  setLocationSearch('');
  setPredictions([]);

  if (!GOOGLE_MAPS_API_KEY) return;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${prediction.place_id}`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'location',
        },
      }
    );
    const data = await response.json();
    if (data.location) {
      setLatitude(data.location.latitude);
      setLongitude(data.location.longitude);
    }
  } catch (error) {
    console.log('Error getting place details:', error);
  }
};

  const openLocationModal = () => {
    setLocationSearch(location);
    setShowLocationModal(true);
    if (location) {
      searchPlaces(location);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your event"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time *</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#d32f2f" />
                <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#d32f2f" />
                <Text style={styles.dateTimeText}>{formatTime(date)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocationModal}
            >
              <Ionicons name="location-outline" size={20} color="#888" />
              <Text style={[styles.locationText, !location && styles.placeholderText]}>
                {location || 'Search for a location'}
              </Text>
              {latitude && longitude && (
                <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
              )}
            </TouchableOpacity>
            {latitude && longitude && (
              <Text style={styles.verifiedText}>Location coordinates captured</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@example.com"
              placeholderTextColor="#666"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create Event</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Search Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for an address..."
                placeholderTextColor="#666"
                value={locationSearch}
                onChangeText={handleLocationSearchChange}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color="#d32f2f" />}
            </View>

            {predictions.length > 0 ? (
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => selectPlace(item)}
                  >
                    <Ionicons name="location" size={20} color="#d32f2f" />
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
                style={styles.predictionsList}
              />
            ) : locationSearch.length >= 3 && !isSearching ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No locations found</Text>
              </View>
            ) : (
              <View style={styles.searchHint}>
                <Ionicons name="information-circle-outline" size={24} color="#888" />
                <Text style={styles.searchHintText}>
                  Start typing to search for a location
                </Text>
              </View>
            )}

            {/* Manual entry option */}
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => {
                if (locationSearch) {
                  setLocation(locationSearch);
                  setLatitude(null);
                  setLongitude(null);
                  setShowLocationModal(false);
                  setPredictions([]);
                }
              }}
            >
              <Text style={styles.manualButtonText}>
                Use "{locationSearch || 'custom location'}" as entered
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 14,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  locationText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#666',
  },
  verifiedText: {
    color: '#4caf50',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  predictionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  predictionText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#888',
    fontSize: 16,
  },
  searchHint: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  searchHintText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  manualButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
