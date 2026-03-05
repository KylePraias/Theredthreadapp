import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Suggestion {
  placePrediction: {
    placeId: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText: { text: string };
    };
  };
}

interface LocationResult {
  description: string;
  lat: number;
  lng: number;
}

interface Props {
  onLocationSelect: (result: LocationResult) => void;
  placeholder?: string;
}

export default function LocationAutocomplete({ onLocationSelect, placeholder = 'Search for a location' }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          },
          body: JSON.stringify({ input }),
        }
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.log('Autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setIsSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(text), 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    const description = suggestion.placePrediction.text.text;
    const placeId = suggestion.placePrediction.placeId;

    setQuery(description);
    setSuggestions([]);
    setIsSelected(true);

    // Fetch place details to get coordinates
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'location',
          },
        }
      );
      const data = await response.json();
      onLocationSelect({
        description,
        lat: data.location.latitude,
        lng: data.location.longitude,
      });
    } catch (error) {
      console.log('Place details error:', error);
      onLocationSelect({ description, lat: 0, lng: 0 });
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsSelected(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={query}
          onChangeText={handleChangeText}
          autoCorrect={false}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color="#888" />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        ) : null}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#4caf50" style={styles.checkIcon} />
        )}
      </View>

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.placePrediction.placeId}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelect(item)}
            >
              <Ionicons name="location-outline" size={16} color="#888" style={styles.suggestionIcon} />
              <View style={styles.suggestionText}>
                <Text style={styles.mainText}>
                  {item.placePrediction.structuredFormat?.mainText?.text || item.placePrediction.text.text}
                </Text>
                {item.placePrediction.structuredFormat?.secondaryText?.text && (
                  <Text style={styles.secondaryText}>
                    {item.placePrediction.structuredFormat.secondaryText.text}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  checkIcon: {
    marginLeft: 4,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  suggestionsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 220,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 10,
  },
  suggestionIcon: {
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
  },
  mainText: {
    color: '#fff',
    fontSize: 15,
  },
  secondaryText: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
});