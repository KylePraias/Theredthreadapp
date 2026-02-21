import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; isOrganization?: string; oobCode?: string }>();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we have an oobCode from the URL (user clicked verification link)
  useEffect(() => {
    if (params.oobCode && params.email) {
      handleVerifyWithCode(params.oobCode);
    }
  }, [params.oobCode]);

  // Poll to check if email has been verified
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!params.email || isLoading) return;
      
      try {
        // Try to login - if successful, email is verified
        const response = await authApi.login({ email: params.email, password: '' });
        // If we get here without error, something went wrong with our logic
      } catch (error: any) {
        const message = error.response?.data?.detail || '';
        // If the error is "Please verify your email first", still not verified
        // If the error is "Invalid credentials", the email is verified but password is wrong
        if (message === 'Invalid credentials') {
          // Email is verified! Redirect to login
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          Alert.alert(
            'Email Verified!',
            'Your email has been verified. Please sign in to continue.',
            [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
          );
        }
      }
    };

    // Start polling every 3 seconds
    pollingIntervalRef.current = setInterval(checkVerificationStatus, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [params.email, isLoading]);

  // Handle deep link for email verification
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      // Parse the oobCode from the Firebase verification link
      const oobCodeMatch = url.match(/[?&]oobCode=([^&]+)/);
      const modeMatch = url.match(/[?&]mode=([^&]+)/);
      
      if (oobCodeMatch && modeMatch && modeMatch[1] === 'verifyEmail') {
        handleVerifyWithCode(oobCodeMatch[1]);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [params.email]);

  const handleVerifyWithCode = async (oobCode: string, isToken: boolean = false) => {
    if (!params.email) {
      Alert.alert('Error', 'Email address is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyEmail(params.email, oobCode, !isToken);
      await login(response.access_token, response.user);
      
      // Route based on user type
      if (response.user.user_type === 'organization') {
        router.replace('/(auth)/pending-approval');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Verification failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await authApi.resendVerification(params.email);
      // In development, the verification_link is returned
      if (response.verification_link) {
        setVerificationLink(response.verification_link);
      }
      Alert.alert('Success', 'A new verification link has been sent to your email');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to resend verification link';
      Alert.alert('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenLink = async () => {
    if (verificationLink) {
      try {
        await Linking.openURL(verificationLink);
      } catch (error) {
        Alert.alert('Error', 'Could not open verification link');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open" size={50} color="#d32f2f" />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>We sent a verification link to</Text>
        <Text style={styles.email}>{params.email}</Text>
      </View>

      <View style={styles.instructionsContainer}>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>Open your email inbox</Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>Find the email from Red Thread</Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionNumber}>
            <Text style={styles.instructionNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>Click the verification link</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Verifying your email...</Text>
        </View>
      )}

      {verificationLink && (
        <TouchableOpacity
          style={styles.openLinkButton}
          onPress={handleOpenLink}
        >
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={styles.openLinkButtonText}>Open Verification Link (Dev)</Text>
        </TouchableOpacity>
      )}

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the email?</Text>
        <TouchableOpacity onPress={handleResend} disabled={isResending}>
          {isResending ? (
            <ActivityIndicator size="small" color="#d32f2f" />
          ) : (
            <Text style={styles.resendLink}>Resend Link</Text>
          )}
        </TouchableOpacity>
      </View>

      {params.isOrganization === 'true' && (
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle" size={20} color="#ff9800" />
          <Text style={styles.note}>
            After verification, your organization will need admin approval before you can create events.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="#888" />
        <Text style={styles.backButtonText}>Back to Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
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
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  email: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '500',
    marginTop: 4,
  },
  instructionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#fff',
    fontSize: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  openLinkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  resendText: {
    color: '#888',
    fontSize: 14,
  },
  resendLink: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  note: {
    flex: 1,
    color: '#ff9800',
    fontSize: 14,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 24,
    gap: 8,
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
