import { Stack } from 'expo-router';

export default function DeveloperLayout() {
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
          title: 'Developer Settings',
          headerTitle: 'Developer Panel',
        }}
      />
    </Stack>
  );
}
