/**
 * SheetKosh — Owner Dashboard
 *
 * Overview of facility stats:
 *  - Today's bookings count (pending, confirmed, arrived)
 *  - Facility capacity utilization
 *  - Quick action cards
 *  - Recent booking activity feed
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { Shadows, Gradients, BorderRadius, FontFamily } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

interface FacilityInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  totalCapacityMt: number;
  status: string;
}

export default function OwnerDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [facility, setFacility] = useState<FacilityInfo | null>(null);
  const [stats, setStats] = useState({
    pendingBookings: 0,
    confirmedBookings: 0,
    todayArrivals: 0,
    storedBookings: 0,
    totalBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Get owner's facility
      const facRes = await api.get<any>('/facilities?ownerId=me&limit=1');
      if (facRes.success && facRes.data?.facilities?.[0]) {
        const fac = facRes.data.facilities[0];
        setFacility(fac);

        // Get bookings for this facility
        const bookRes = await api.get<any>(`/bookings/facility/${fac.id}?limit=20`);
        if (bookRes.success && bookRes.data) {
          const all = bookRes.data.bookings || [];
          setRecentBookings(all.slice(0, 5));
          setStats({
            pendingBookings: all.filter((b: any) => b.status === 'PENDING').length,
            confirmedBookings: all.filter((b: any) => b.status === 'CONFIRMED').length,
            todayArrivals: all.filter((b: any) => b.status === 'ARRIVED' || b.status === 'WEIGHING').length,
            storedBookings: all.filter((b: any) => b.status === 'STORED').length,
            totalBookings: bookRes.data.total || 0,
          });
        }
      }
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = [
    { label: 'Pending', value: stats.pendingBookings, icon: 'hourglass-outline', color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Confirmed', value: stats.confirmedBookings, icon: 'checkmark-circle-outline', color: '#059669', bg: '#D1FAE5' },
    { label: 'At Facility', value: stats.todayArrivals, icon: 'location-outline', color: '#3B82F6', bg: '#DBEAFE' },
    { label: 'Stored', value: stats.storedBookings, icon: 'cube-outline', color: '#7C3AED', bg: '#EDE9FE' },
  ];

  const STATUS_COLOR: Record<string, string> = {
    PENDING: '#F59E0B', CONFIRMED: '#059669', ARRIVED: '#3B82F6',
    WEIGHING: '#8B5CF6', STORED: '#047857', DISPATCH_REQUESTED: '#EA580C',
    DISPATCHED: '#0891B2', COMPLETED: '#10B981', CANCELLED: '#EF4444', REJECTED: '#EF4444',
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={Gradients.meshViolet as any} style={styles.header}>
        <View style={styles.grainOverlay} />
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.fullName || 'Owner'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => { router.push('/notifications'); hapticLight(); }}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#7C3AED" />}
      >
        {/* Facility Badge */}
        {facility && (
          <View style={styles.facilityBadge}>
            <View style={styles.facilityIcon}>
              <Ionicons name="business" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.facilityName}>{facility.name}</Text>
              <Text style={styles.facilityLocation}>{facility.city}, {facility.state}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: facility.status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: facility.status === 'ACTIVE' ? '#059669' : '#D97706' }}>
                {facility.status}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          {statCards.map(s => (
            <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
              <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{loading ? '-' : s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => { router.push('/(owner)/scan'); hapticLight(); }}>
            <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.actionGradient}>
              <Ionicons name="qr-code-outline" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => { router.push('/(owner)/bookings'); hapticLight(); }}>
            <View style={[styles.actionGradient, { backgroundColor: '#F0FFF4' }]}>
              <Ionicons name="calendar-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.actionLabel}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => { router.push('/settings'); hapticLight(); }}>
            <View style={[styles.actionGradient, { backgroundColor: '#F9FAFB' }]}>
              <Ionicons name="settings-outline" size={24} color="#6B7280" />
            </View>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Bookings */}
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {loading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
        ) : recentBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          recentBookings.map(b => (
            <TouchableOpacity
              key={b.id}
              style={styles.bookingRow}
              onPress={() => { router.push(`/booking/${b.id}` as any); hapticLight(); }}
            >
              <View style={[styles.bookingDot, { backgroundColor: STATUS_COLOR[b.status] || '#9CA3AF' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle}>#{b.bookingNumber} • {b.commodityName}</Text>
                <Text style={styles.bookingMeta}>
                  {b.farmer?.fullName} • {b.estimatedWeightKg} Kg
                </Text>
              </View>
              <Text style={[styles.bookingStatus, { color: STATUS_COLOR[b.status] || '#9CA3AF' }]}>
                {b.status.replace(/_/g, ' ')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F7FC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 20, paddingHorizontal: 20,
  },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  notifBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { padding: 20 },

  // Facility badge
  facilityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 18, padding: 16,
    marginBottom: 20, ...Shadows.glass,
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.06)',
  },
  facilityIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  facilityName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  facilityLocation: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 18, padding: 16,
    ...Shadows.glass, borderLeftWidth: 3,
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.06)',
  },
  statIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, alignItems: 'center', gap: 8 },
  actionGradient: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },

  // Bookings
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 8,
    ...Shadows.glass,
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.06)',
  },
  bookingDot: { width: 8, height: 8, borderRadius: 4 },
  bookingTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  bookingMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  bookingStatus: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginRight: 4 },

  // Empty
  emptyCard: {
    alignItems: 'center', gap: 8, paddingVertical: 40,
    backgroundColor: '#FFF', borderRadius: 18, ...Shadows.glass,
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.06)',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});
