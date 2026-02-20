import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#0c0c0c' },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="signup-type" options={{ title: 'Join Us' }} />
      <Stack.Screen name="individual-signup" options={{ title: 'Individual Signup' }} />
      <Stack.Screen name="organization-signup" options={{ title: 'Organization Signup' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
      <Stack.Screen name="pending-approval" options={{ title: 'Pending Approval', headerShown: false }} />
      <Stack.Screen name="rejected" options={{ title: 'Application Status', headerShown: false }} />
    </Stack>
  );
}