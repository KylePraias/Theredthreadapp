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
import { authApi } from '../../src/api/auth';
import { submitAppeal } from '../../src/api/admin';
import { useAuthStore } from '../../src/store/authStore';

interface DisabledAccountInfo {
  reason: string;
  email: string;
  hasPendingAppeal: boolean;
  disableCount: number;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Disabled account modal state
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [disabledInfo, setDisabledInfo] = useState<DisabledAccountInfo | null>(null);
  const [appealMessage, setAppealMessage] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  
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
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // Check if account is disabled
      const errorDetail = error.response?.data?.detail;
      
      if (errorDetail && typeof errorDetail === 'object' && errorDetail.code === 'ACCOUNT_DISABLED') {
        // can_appeal is false if user has already submitted an appeal (pending or reviewed)
        const canSubmitAppeal = errorDetail.can_appeal !== false;
        
        setDisabledInfo({
          reason: errorDetail.reason,
          email: errorDetail.user_email,
          hasPendingAppeal: errorDetail.has_pending_appeal,
          disableCount: errorDetail.disable_count,
        });
        // Show "appeal submitted" state if they can't appeal (already submitted)
        setAppealSubmitted(!canSubmitAppeal);
        setShowDisabledModal(true);
      } else {
        const message = typeof errorDetail === 'string' 
          ? errorDetail 
          : 'Login failed. Please try again.';
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) {
      Alert.alert('Error', 'Please explain why your account should be re-enabled');
      return;
    }

    if (!disabledInfo) return;

    setIsSubmittingAppeal(true);
    try {
      await submitAppeal(disabledInfo.email, appealMessage.trim());
      setAppealSubmitted(true);
      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted successfully. You will receive an email once an admin has reviewed your case.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to submit appeal';
      Alert.alert('Error', message);
    } finally {
      setIsSubmittingAppeal(false);
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

  const closeDisabledModal = () => {
    setShowDisabledModal(false);
    setDisabledInfo(null);
    setAppealMessage('');
    setAppealSubmitted(false);
  };

  const renderDisabledAccountModal = () => (
    <Modal
      visible={showDisabledModal}
      transparent={true}
      animationType="fade"
      onRequestClose={closeDisabledModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.disabledModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.disabledIconContainer}>
              <Ionicons name="ban" size={32} color="#f44336" />
            </View>
            <Text style={styles.disabledTitle}>Account Disabled</Text>
            <TouchableOpacity 
              onPress={closeDisabledModal}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.disabledMessage}>
              Your account has been disabled by an administrator.
            </Text>

            {disabledInfo && (
              <>
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonLabel}>Reason for disabling:</Text>
                  <Text style={styles.reasonText}>{disabledInfo.reason}</Text>
                </View>

                {disabledInfo.disableCount > 1 && (
                  <Text style={styles.disableCountText}>
                    This account has been disabled {disabledInfo.disableCount} time(s).
                  </Text>
                )}

                {appealSubmitted ? (
                  <View style={styles.appealPendingContainer}>
                    <Ionicons name="time" size={24} color="#ff9800" />
                    <Text style={styles.appealPendingTitle}>Appeal Under Review</Text>
                    <Text style={styles.appealPendingText}>
                      You have already submitted an appeal for this disable. Please wait while an administrator reviews your case. You will receive an email notification with the decision.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.appealFormContainer}>
                    <Text style={styles.appealFormTitle}>Submit an Appeal</Text>
                    <Text style={styles.appealFormDescription}>
                      If you believe this was a mistake, you can submit an appeal explaining why your account should be re-enabled.
                    </Text>

                    <TextInput
                      style={styles.appealInput}
                      placeholder="Explain why your account should be re-enabled..."
                      placeholderTextColor="#666"
                      value={appealMessage}
                      onChangeText={setAppealMessage}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                    />

                    <TouchableOpacity
                      style={[styles.submitAppealButton, isSubmittingAppeal && styles.buttonDisabled]}
                      onPress={handleSubmitAppeal}
                      disabled={isSubmittingAppeal}
                    >
                      {isSubmittingAppeal ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={20} color="#fff" />
                          <Text style={styles.submitAppealText}>Submit Appeal</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={closeDisabledModal}
          >
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup-type')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Disabled Account Modal */}
      {renderDisabledAccountModal()}

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
              <Text style={styles.forgotModalTitle}>Reset Password</Text>
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
  disabledModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    flex: 1,
    marginLeft: 12,
  },
  forgotModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  disabledMessage: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  reasonContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  reasonLabel: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  reasonText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  disableCountText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  appealPendingContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  appealPendingTitle: {
    color: '#ff9800',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  appealPendingText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  appealFormContainer: {
    marginTop: 8,
  },
  appealFormTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  appealFormDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  appealInput: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 120,
    marginBottom: 16,
  },
  submitAppealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitAppealText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  closeModalButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  closeModalText: {
    color: '#888',
    fontSize: 16,
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
