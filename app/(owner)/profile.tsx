/**
 * SheetKosh — Owner Profile Screen
 *
 * Profile page for cold storage owners.
 * Shows profile info, facility link, settings, logout.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Shadows } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

export default function OwnerProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logout(); hapticLight(); } },
    ]);
  };

  const menuItems = [
    { icon: 'business-outline', label: 'My Facility', route: '/settings', color: '#7C3AED' },
    { icon: 'people-outline', label: 'Staff Management', route: '/settings', color: '#059669' },
    { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', color: '#F59E0B' },
    { icon: 'settings-outline', label: 'Settings', route: '/settings', color: '#6B7280' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: '/settings', color: '#3B82F6' },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.[0] || 'O'}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName || 'Owner'}</Text>
        <Text style={styles.role}>Cold Storage Owner</Text>
        {user?.uniqueId && <Text style={styles.uid}>ID: {user.uniqueId}</Text>}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{user?.phone || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{user?.email || '-'}</Text>
          </View>
        </View>

        {/* Menu */}
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => { router.push(item.route as any); hapticLight(); }}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7FC' },
  header: {
    alignItems: 'center', gap: 6,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  name: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  role: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  uid: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  scrollContent: { padding: 20 },

  infoCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    marginBottom: 20, gap: 10, ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6',
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
