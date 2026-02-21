import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { storage } from '../../src/utils/storage';

export default function VerifyEmailCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ oobCode?: string; mode?: string; token?: string; email?: string }>();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get saved email from storage or from URL params
    const initVerification = async () => {
      let emailToUse = params.email || '';
      
      if (!emailToUse) {
        const savedEmail = await storage.getItem('pending_verification_email');
        if (savedEmail) {
          emailToUse = savedEmail;
        }
      }
      
      if (emailToUse) {
        setEmail(emailToUse);
        
        // Check if we have a token (custom verification)
        if (params.token) {
          handleVerify(emailToUse, params.token, false);
        }
        // Check if we have oobCode (Firebase verification)
        else if (params.oobCode && params.mode === 'verifyEmail') {
          handleVerify(emailToUse, params.oobCode, true);
        }
      } else {
        // User opened link on different device, need to ask for email
        setNeedsEmail(true);
      }
    };

    initVerification();
  }, [params.oobCode, params.token, params.email]);

  const handleVerify = async (emailToVerify: string, tokenOrCode: string, isOobCode: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.verifyEmail(emailToVerify, tokenOrCode, isOobCode);
      
      // Clear the pending email
      await storage.deleteItem('pending_verification_email');
      
      // Show success and redirect to login
      Alert.alert(
        'Email Verified!',
        'Your email has been verified successfully. Please sign in to continue.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Verification failed. Please try again.';
      setError(message);
      setIsLoading(false);
    }
  };

  const handleSubmitEmail = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    // Determine which verification method to use
    if (params.token) {
      handleVerify(email.trim(), params.token, false);
    } else if (params.oobCode) {
      handleVerify(email.trim(), params.oobCode, true);
    } else {
      setError('Invalid verification link');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Verifying your email...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={60} color="#f44336" />
          </View>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (needsEmail) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-open" size={50} color="#d32f2f" />
          </View>
          <Text style={styles.title}>Confirm Your Email</Text>
          <Text style={styles.subtitle}>
            Please enter the email address you used to sign up
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleSubmitEmail}
        >
          <Text style={styles.verifyButtonText}>Verify Email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Processing verification link...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    padding: 24,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  verifyButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
