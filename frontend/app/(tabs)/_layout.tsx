import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isOrganization = user?.user_type === 'organization' && user?.approval_status === 'approved';

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
        name="organizations"
        options={{
          title: 'Orgs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          headerTitle: 'Organizations',
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
      <Tabs.Screen
        name="my-events"
        options={{
          title: 'My Events',
          href: isOrganization ? '/my-events' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
          headerTitle: 'My Events',
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          title: 'Create',
          href: isOrganization ? '/create-event' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
          headerTitle: 'Create Event',
        }}
      />
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
        name="edit-event/[id]"
        options={{
          href: null,
          headerTitle: 'Edit Event',
        }}
      />
      <Tabs.Screen
        name="organization/[id]"
        options={{
          href: null,
          headerTitle: 'Organization',
        }}
      />
    </Tabs>
  );
}