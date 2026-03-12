import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#0c0c0c' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Organization Approvals',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'User Management',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="appeals"
        options={{
          title: 'Appeals',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
