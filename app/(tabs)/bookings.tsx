/**
 * ColdStorage — Bookings Tab
 *
 * Updated:
 * - Header kept premium like screenshot
 * - Search box moved out of header
 * - Cards, filters, pagination, API logic remain same
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
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

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string; soft: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#B45309', icon: 'hourglass-outline', soft: '#FFFBEB' },
  CONFIRMED: { bg: '#D1FAE5', text: '#047857', icon: 'checkmark-circle-outline', soft: '#ECFDF5' },
  ARRIVED: { bg: '#DBEAFE', text: '#2563EB', icon: 'location-outline', soft: '#EFF6FF' },
  WEIGHING: { bg: '#EDE9FE', text: '#7C3AED', icon: 'scale-outline', soft: '#F5F3FF' },
  STORED: { bg: '#CCFBF1', text: '#0F766E', icon: 'cube-outline', soft: '#F0FDFA' },
  DISPATCH_REQUESTED: { bg: '#FFEDD5', text: '#C2410C', icon: 'arrow-up-circle-outline', soft: '#FFF7ED' },
  DISPATCHING: { bg: '#CFFAFE', text: '#0E7490', icon: 'car-outline', soft: '#ECFEFF' },
  DISPATCHED: { bg: '#CFFAFE', text: '#155E75', icon: 'checkmark-done-outline', soft: '#F0FDFF' },
  COMPLETED: { bg: '#D1FAE5', text: '#10B981', icon: 'trophy-outline', soft: '#ECFDF5' },
  CANCELLED: { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle-outline', soft: '#FEF2F2' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626', icon: 'ban-outline', soft: '#FEF2F2' },
};

export default function BookingsTab() {
  const router = useRouter();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const hasTriggeredEndRef = useRef(false);

  const fetchBookings = useCallback(
    async (p = 1, reset = true) => {
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', '15');
        if (statusFilter) params.set('status', statusFilter);

        const res = await api.get<any>(`/bookings/my?${params.toString()}`);

        if (res.success && res.data) {
          const items = res.data.bookings || [];
          setBookings(prev => (reset ? items : [...prev, ...items]));
          setTotal(res.data.total || 0);
          setHasMore(items.length === 15);
          setPage(p);
        } else if (reset) {
          setBookings([]);
          setTotal(0);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch bookings', err);
        if (reset) {
          setBookings([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        hasTriggeredEndRef.current = false;
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchBookings(1, true);
  }, [statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings(1, true);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || bookings.length < 10 || hasTriggeredEndRef.current) return;
    hasTriggeredEndRef.current = true;
    fetchBookings(page + 1, false);
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;

    return bookings.filter(item =>
      item.bookingNumber?.toLowerCase().includes(q) ||
      item.facility?.name?.toLowerCase().includes(q) ||
      item.commodityName?.toLowerCase().includes(q) ||
      item.facility?.city?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const statusStats = useMemo(
    () => ({
      pending: bookings.filter(b => b.status === 'PENDING').length,
      active: bookings.filter(b =>
        ['CONFIRMED', 'ARRIVED', 'WEIGHING', 'STORED', 'DISPATCH_REQUESTED', 'DISPATCHING', 'DISPATCHED'].includes(b.status)
      ).length,
      completed: bookings.filter(b => b.status === 'COMPLETED').length,
    }),
    [bookings]
  );

  const renderBooking = ({ item, index }: { item: any; index: number }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
    const preferredDate = item.preferredDate
      ? new Date(item.preferredDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    return (
      <TouchableOpacity
        style={s.bookingCard}
        activeOpacity={0.82}
        onPress={() => {
          router.push(`/booking/${item.id}`);
          hapticLight();
        }}
      >
        <View style={s.cardTop}>
          <View style={s.cardIconWrap}>
            <View style={[s.cardIcon, { backgroundColor: index % 2 === 0 ? '#E8F5F0' : '#EEF2FF' }]}>
              <Ionicons name="snow-outline" size={18} color={index % 2 === 0 ? '#0F766E' : '#4F46E5'} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.bookingNo}>#{item.bookingNumber}</Text>
            <Text style={s.facilityName} numberOfLines={1}>
              {item.facility?.name || 'Facility'}
            </Text>
          </View>

          <View style={[s.statusChip, { backgroundColor: sc.soft, borderColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={12} color={sc.text} />
            <Text style={[s.statusChipText, { color: sc.text }]}>
              {String(item.status || 'PENDING').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.infoPill}>
            <Ionicons name="leaf-outline" size={13} color="#6B7280" />
            <Text style={s.infoPillText} numberOfLines={1}>
              {item.commodityName || 'Commodity'}
            </Text>
          </View>

          <View style={s.infoPill}>
            <Ionicons name="scale-outline" size={13} color="#6B7280" />
            <Text style={s.infoPillText}>
              {item.estimatedWeightKg || 0} Kg
            </Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={s.metaText}>{preferredDate}</Text>
          </View>

          {item.facility?.city ? (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={s.metaText} numberOfLines={1}>
                {item.facility.city}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.cardArrow}>
          <Ionicons name="chevron-forward" size={16} color="#A7B0BA" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={['#082B24', '#103E34', '#0A8B7D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.heroGlowTop} />
        <View style={s.heroGlowRight} />
        <View style={s.heroGlowBottom} />

        <View style={{ height: Platform.OS === 'ios' ? 56 : 38 }} />

        <View style={s.headerContent}>
          <Text style={s.headerTitle}>My Bookings</Text>
          <Text style={s.headerSub}>Track your storage requests and facility activity.</Text>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryNumber}>{total}</Text>
            <Text style={s.summaryLabel}>TOTAL</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCard}>
            <Text style={s.summaryNumber}>{statusStats.active}</Text>
            <Text style={s.summaryLabel}>ACTIVE</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCard}>
            <Text style={[s.summaryNumber, { color: '#F4CF7A' }]}>{statusStats.pending}</Text>
            <Text style={s.summaryLabel}>PENDING</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.searchSection}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search booking, facility, crop..."
            placeholderTextColor="#98A2B3"
            style={s.searchInput}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.82}>
              <Ionicons name="close-circle" size={18} color="#A0A8B5" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={s.filterRow}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f.key}
          contentContainerStyle={s.filterContent}
          renderItem={({ item: f }) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => {
                  setStatusFilter(f.key);
                  hapticLight();
                }}
                activeOpacity={0.82}
              >
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={s.loadingLabel}>Loading bookings...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={42} color="#C7CDD6" />
          </View>
          <Text style={s.emptyTitle}>No bookings yet</Text>
          <Text style={s.emptyText}>
            Find a cold storage and book your first slot.
          </Text>
          <TouchableOpacity
            style={s.discoverBtn}
            onPress={() => {
              router.push('/(tabs)/discover');
              hapticLight();
            }}
            activeOpacity={0.84}
          >
            <Ionicons name="search-outline" size={16} color="#2D6A4F" />
            <Text style={s.discoverBtnText}>Find Storage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={b => b.id}
          renderItem={renderBooking}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2D6A4F"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.25}
          onMomentumScrollBegin={() => {
            hasTriggeredEndRef.current = false;
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 18 }} color="#2D6A4F" />
            ) : (
              <View style={{ height: 18 }} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  heroGlowTop: {
    position: 'absolute',
    top: -84,
    right: -18,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  heroGlowRight: {
    position: 'absolute',
    top: 18,
    right: -64,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(28,214,192,0.11)',
  },

  heroGlowBottom: {
    position: 'absolute',
    left: -86,
    bottom: -88,
    width: 250,
    height: 150,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  headerContent: {
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.7,
  },

  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 6,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 5,
    letterSpacing: 0.8,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
    backgroundColor: '#F6F7F3',
  },

  searchBox: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E4E8E4',
    shadowColor: '#173528',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    color: '#23323D',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },

  filterRow: {
    paddingVertical: 10,
    backgroundColor: '#F6F7F3',
  },

  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E9E3',
  },

  filterChipActive: {
    backgroundColor: '#1B5E4A',
    borderColor: '#1B5E4A',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6B7A',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#F0F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#E8F5F0',
    borderWidth: 1,
    borderColor: '#D4E8DC',
  },

  discoverBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D6A4F',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8ECE8',
    shadowColor: '#1B332A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  cardIconWrap: {},

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookingNo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },

  facilityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 2,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F5F7F4',
  },

  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F6B7A',
  },

  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  cardArrow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
});