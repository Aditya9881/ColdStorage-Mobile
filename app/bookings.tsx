/**
 * SheetKosh — My Bookings Screen
 *
 * Lists farmer's bookings with status filter chips.
 * Accessible from the home tab and profile.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'STORED', label: 'Stored' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706', icon: 'hourglass-outline' },
  CONFIRMED: { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle-outline' },
  ARRIVED: { bg: '#DBEAFE', text: '#2563EB', icon: 'location-outline' },
  WEIGHING: { bg: '#EDE9FE', text: '#7C3AED', icon: 'scale-outline' },
  STORED: { bg: '#D1FAE5', text: '#047857', icon: 'cube-outline' },
  DISPATCH_REQUESTED: { bg: '#FFEDD5', text: '#EA580C', icon: 'arrow-up-circle-outline' },
  DISPATCHING: { bg: '#CFFAFE', text: '#0891B2', icon: 'car-outline' },
  DISPATCHED: { bg: '#CFFAFE', text: '#0E7490', icon: 'checkmark-done-outline' },
  COMPLETED: { bg: '#D1FAE5', text: '#10B981', icon: 'trophy-outline' },
  CANCELLED: { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626', icon: 'ban-outline' },
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(async (p = 1, reset = true) => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '15');
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<any>(`/bookings/my?${params.toString()}`);
      if (res.success && res.data) {
        const items = res.data.bookings || [];
        setBookings(prev => reset ? items : [...prev, ...items]);
        setTotal(res.data.total || 0);
        setHasMore(items.length === 15);
        setPage(p);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchBookings(1, true);
  }, [statusFilter]);

  const handleRefresh = () => { setRefreshing(true); fetchBookings(1, true); };
  const handleLoadMore = () => { if (hasMore && !loading) fetchBookings(page + 1, false); };

  const renderBooking = ({ item }: { item: any }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        activeOpacity={0.7}
        onPress={() => { router.push(`/booking/${item.id}`); hapticLight(); }}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardIcon}>
            <Ionicons name="snow-outline" size={18} color="#2D6A4F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingNo}>#{item.bookingNumber}</Text>
            <Text style={styles.facilityName} numberOfLines={1}>{item.facility?.name || 'Facility'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={12} color={sc.text} />
            <Text style={[styles.statusChipText, { color: sc.text }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailCol}>
            <Ionicons name="leaf-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>{item.commodityName}</Text>
          </View>
          <View style={styles.detailCol}>
            <Ionicons name="scale-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>{item.estimatedWeightKg} Kg</Text>
          </View>
          <View style={styles.detailCol}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailText}>
              {new Date(item.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>{total} total bookings</Text>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => { setStatusFilter(f.key); hapticLight(); }}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bookings list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyText}>Find a cold storage facility and book your first storage slot</Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => { router.push('/(tabs)/discover'); hapticLight(); }}
          >
            <Ionicons name="search-outline" size={16} color="#2D6A4F" />
            <Text style={{ color: '#2D6A4F', fontWeight: '600', fontSize: 14 }}>Discover Facilities</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={b => b.id}
          renderItem={renderBooking}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2D6A4F" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#2D6A4F" /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Filters
  filterRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#FFF' },

  // Booking card
  bookingCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6', position: 'relative',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FFF4',
    alignItems: 'center', justifyContent: 'center',
  },
  bookingNo: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  facilityName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardDetails: { flexDirection: 'row', gap: 16 },
  detailCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },

  // Empty state
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  discoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#2D6A4F',
  },
});
