import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { isFirebaseConfigured } from '../../src/config/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      await login(response.access_token, response.user);
      
      // Route based on user type and status
      if (response.user.user_type === 'organization' && response.user.approval_status === 'pending') {
        router.replace('/(auth)/pending-approval');
      } else if (response.user.user_type === 'organization' && response.user.approval_status === 'rejected') {
        router.replace('/(auth)/rejected');
      } else {
        // All users (including admin) go to event feed
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      Alert.alert(
        'Check Your Email',
        'If an account with that email exists, a password reset link has been sent. Please check your inbox.',
        [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
      );
      setForgotEmail('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to send reset email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
  if (!isFirebaseConfigured()) {
    Alert.alert(
      'Configuration Error',
      'Firebase is not properly configured. Please check your environment variables.'
    );
    return;
  }

  setIsGoogleLoading(true);
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'redthread',
    });

    const discovery = await AuthSession.fetchDiscoveryAsync(
      'https://accounts.google.com'
    );

    const request = new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(discovery);

    if (result.type !== 'success') {
      if (result.type === 'error') {
        Alert.alert('Error', result.error?.message || 'Google Sign-In failed');
      }
      return;
    }

    const { access_token } = result.params;

    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );
    const googleUser = await userInfoResponse.json();

    if (!googleUser || !googleUser.email) {
      throw new Error('Failed to get user information from Google');
    }

    // Send to our backend
    const response = await authApi.googleSignInIndividual({
      firebase_uid: googleUser.id,
      email: googleUser.email,
      display_name: googleUser.name || googleUser.email.split('@')[0],
      profile_image: googleUser.picture || undefined,
    });

    await login(response.access_token, response.user);

    // Route based on user type
    if (response.user.user_type === 'organization' && response.user.approval_status === 'pending') {
      router.replace('/(auth)/pending-approval');
    } else if (response.user.user_type === 'organization' && response.user.approval_status === 'rejected') {
      router.replace('/(auth)/rejected');
    } else {
      router.replace('/(tabs)');
    }
  } catch (error: any) {
    console.log('Google Sign-In Error:', error);

    // Check if it's a backend error about existing account
    const backendMessage = error.response?.data?.detail;
    if (backendMessage) {
      Alert.alert('Sign In Error', backendMessage);
      return;
    }

    Alert.alert(
      'Sign In Error',
      error.message || 'Failed to sign in with Google. Please try again.'
    );
  } finally {
    setIsGoogleLoading(false);
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
        <View style={styles.header}>
          <Ionicons name="people-circle" size={80} color="#d32f2f" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={() => setShowForgotPassword(true)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup-type')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity 
                onPress={() => setShowForgotPassword(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <View style={styles.modalInputContainer}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowForgotPassword(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  form: {
    gap: 16,
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
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
    gap: 8,
  },
  footerText: {
    color: '#888',
    fontSize: 16,
  },
  footerLink: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
  },
});
