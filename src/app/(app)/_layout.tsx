import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs, useRootNavigationState } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import colors, { white } from '@/components/ui/colors';
import { useAuth } from '@/lib/auth';
import useLockStateDetection from '@/lib/hooks/useLockStateDetection';
import { useUserStore } from '@/store/user-store';

// Tab icon component
function TabBarIcon({
  name,
  color,
  size = 24,
  focused = false,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  size?: number;
  focused?: boolean;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      style={focused ? { opacity: 1 } : { opacity: 0.8 }}
    />
  );
}

// Custom center button component
function CenterButton({
  focused,
}: {
  focused: boolean;
  color?: string; // Unused but required by the tab bar API
}) {
  return (
    <View className="-mt-5 items-center justify-center">
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: focused ? colors.primary[300] : colors.primary[400],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="compass" size={28} color={white} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const navigationState = useRootNavigationState();

  // Activate lock detection for the whole main app.
  useLockStateDetection();

  const authStatus = useAuth((state) => state.status);
  const { user } = useUserStore.getState();
  console.log(
    ' 👤 [AppLayout] the user is a provisional user: ',
    user?.isProvisional
  );

  // Auth protection
  if (authStatus === 'signOut') {
    console.log('[AppLayout] Redirecting to login - not authenticated');
    return <Redirect href="/login" />;
  }

  // provisional users shouldn't be here, cause a login so they can create an account
  if (user && user?.isProvisional) {
    console.log(
      '[AppLayout] Redirecting to login - provisional user trying to access protected app route.'
    );
  }

  // Check if navigation is ready
  if (!navigationState?.key) {
    return null;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.white, // Warm cream for active tabs
        tabBarInactiveTintColor: colors.neutral[200], // Light gray for inactive tabs
        sceneContainerStyle: {
          backgroundColor: colors.black,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.neutral[300], // Medium gray for borders
          height: 120,
          paddingBottom: 20,
          // Hide tab bar for quest screens and pending-quest
          display:
            ['pending-quest', 'quest-discovery', 'invitation-waiting'].includes(
              route.name
            ) || route.name.startsWith('quest/')
              ? 'none'
              : 'flex',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 6,
          paddingTop: 2,
        },
      })}
    >
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="book" color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'journal-tab',
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="map" color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'map-tab',
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: ({ focused, color }) => (
            <CenterButton focused={focused} color={color} />
          ),
          tabBarButtonTestID: 'new-quest-tab',
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 8,
            paddingTop: 2,
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="user" color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'profile-tab',
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="settings" color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'settings-tab',
        }}
      />

      <Tabs.Screen
        name="custom-quest"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reminder-setup"
        options={{
          href: null,
        }}
      />
      {/* Screen for viewing quest details within the (app) group */}
      <Tabs.Screen
        name="quest/[id]"
        options={{
          href: null, // Doesn't show in the tab bar
          // Optional: if you want a specific title for this screen in a stack header (if applicable)
          // title: "Quest Details",
        }}
      />
      <Tabs.Screen
        name="quest/reflection"
        options={{
          href: null, // Doesn't show in the tab bar
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="quest-discovery"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="invitation-waiting"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="skill-tree"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
