import { Redirect, Tabs, useRootNavigationState } from 'expo-router';
import { Book, Compass, Map, Settings, User } from 'lucide-react-native';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import useLockStateDetection from '@/lib/hooks/useLockStateDetection';
import {
  colors,
  fontFamily,
  fontSize,
  palette,
  radii,
  shadows,
  withAlpha,
} from '@/theme';

/** Default hit size for side tab icons (Journal, Map, Profile, Settings). */
const TAB_ICON_SIZE = 22;

/**
 * Height of the tab bar's visible content zone, measured above the bottom
 * safe-area inset. react-navigation returns a numeric `tabBarStyle.height`
 * verbatim and skips its own `+ insets.bottom` (see `getTabBarHeight` in
 * BottomTabBar), so a flat height silently swallows the inset — the bar's top
 * edge then rides ~1 nav-bar higher on every Android device, squeezing the
 * scene above it. Add the inset explicitly instead.
 */
const TAB_BAR_CONTENT_HEIGHT = 56;

/** Raised center-orb geometry. */
const ORB_SIZE = 56;
const ORB_RAISE = -20;

// Tab icon component
function TabBarIcon({
  icon,
  color,
  size = TAB_ICON_SIZE,
  focused = false,
}: {
  icon: React.ReactElement<{
    color?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
  }>;
  color: string;
  size?: number;
  focused?: boolean;
}) {
  return React.cloneElement(icon, {
    color,
    size,
    style: focused ? { opacity: 1 } : { opacity: 0.8 },
  });
}

// Custom center button component
function CenterButton({
  focused,
}: {
  focused: boolean;
  color?: string; // Unused but required by the tab bar API
}) {
  return (
    <View
      style={{
        marginTop: ORB_RAISE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: radii.pill,
          backgroundColor: focused
            ? colors.accent.primaryHover
            : colors.accent.primary,
          borderWidth: 2,
          borderColor: withAlpha(palette.bone, 0.18),
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.glowEmber,
          elevation: shadows.raised.elevation,
        }}
      >
        <Compass size={26} color={colors.text.onAccent} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const navigationState = useRootNavigationState();
  const insets = useSafeAreaInsets();

  // Activate lock detection for the whole main app.
  useLockStateDetection();

  const authStatus = useAuth((state) => state.status);

  // Auth protection
  if (authStatus === 'signOut') {
    return <Redirect href="/login" />;
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
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.muted,
        sceneStyle: {
          backgroundColor: colors.surface.app,
        },
        tabBarStyle: {
          backgroundColor: colors.surface.overlay,
          borderTopWidth: 1,
          borderTopColor: colors.border.hairline,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          // Hide tab bar for quest screens and pending-quest
          display:
            ['pending-quest', 'quest-discovery', 'invitation-waiting'].includes(
              route.name
            ) || route.name.startsWith('quest/')
              ? 'none'
              : 'flex',
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: fontSize.caption,
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
            <TabBarIcon icon={<Book />} color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'journal-tab',
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={<Map />} color={color} focused={focused} />
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
            fontFamily: fontFamily.semibold,
            fontSize: fontSize.caption,
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
            <TabBarIcon icon={<User />} color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'profile-tab',
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={<Settings />} color={color} focused={focused} />
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
        name="stats"
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
      <Tabs.Screen
        name="guild/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="guild/create"
        options={{
          href: null,
        }}
      />
      {/* Dev-only Emberglow component gallery — not linked from any menu, reached by URL. */}
      <Tabs.Screen
        name="emberglow-gallery"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
