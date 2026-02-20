import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isOrganization = user?.user_type === 'organization';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#d32f2f',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          headerTitle: 'Event Feed',
        }}
      />
      <Tabs.Screen
        name="my-rsvps"
        options={{
          title: 'My RSVPs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
          headerTitle: 'My RSVPs',
        }}
      />
      {isOrganization && (
        <Tabs.Screen
          name="my-events"
          options={{
            title: 'My Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone" size={size} color={color} />
            ),
            headerTitle: 'My Events',
          }}
        />
      )}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
          headerTitle: 'Settings',
        }}
      />
      <Tabs.Screen
        name="event/[id]"
        options={{
          href: null,
          headerTitle: 'Event Details',
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          href: null,
          headerTitle: 'Create Event',
        }}
      />
      <Tabs.Screen
        name="edit-event/[id]"
        options={{
          href: null,
          headerTitle: 'Edit Event',
        }}
      />
    </Tabs>
  );
}