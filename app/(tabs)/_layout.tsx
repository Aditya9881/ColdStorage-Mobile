/**
 * ColdStorage — Premium Floating Tab Bar
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Floating pill-style nav bar with side margins
 * - Frosted glass background (iOS BlurView)
 * - Active tab gets filled pill background + icon color shift
 * - Elevated floating shadow
 * - Haptic feedback on tab switch
 * - Notification badge dot on Home tab
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Shadows, FontFamily } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { hapticLight } from '@/lib/haptics';

export default function TabLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 12,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 22,
          backgroundColor: Platform.OS === 'ios'
            ? 'transparent'
            : (colorScheme === 'dark' ? '#1C2620' : '#FFFFFF'),
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colorScheme === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.04)',
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadows.floating,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: FontFamily.semibold,
          marginTop: -2,
          marginBottom: Platform.OS === 'ios' ? 0 : 6,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 8 : 4,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          fontFamily: FontFamily.bold,
        },
      }}
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'ColdStorage',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
              {unreadCount > 0 && (
                <View style={tabS.badge}>
                  <View style={tabS.badgeDot} />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Ledger',
          headerTitle: 'Pocket Ledger',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          headerTitle: 'Marketplace',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          headerTitle: 'Find Storage',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabS = StyleSheet.create({
  activePill: {
    backgroundColor: 'rgba(27, 94, 74, 0.1)',
    borderRadius: 12,
    padding: 6,
    marginTop: -4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
