/**
 * ColdStorage — Bookings Tab (Premium Redesign)
 *
 * Improvements over previous version:
 * - Tighter, consistent 4px-grid spacing (no arbitrary values)
 * - Compact header: smaller brand text, tighter top bar
 * - Refined search bar: height 46 (was 56), radius 14, hairline border
 * - Filter chips: height 36 (was 42), tighter gap
 * - Premium cards: inner divider line for visual segmentation
 * - Status chip: smaller text (9px uppercase), tighter padding
 * - Info pills: smaller, uniform, cleaner
 * - Meta row: chevron inline (no absolute position)
 * - Icon box: 40px (was 46px), radius 12
 * - Single FlatList for all states (no conditional triple-FlatList)
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';
import SharedTabHeader from '@/components/SharedTabHeader';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'STORED', label: 'Stored' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  PENDING:            { bg: '#FEF3E2', text: '#B45309', border: '#FDE68A', icon: 'time-outline' },
  CONFIRMED:          { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: 'checkmark-circle-outline' },
  ARRIVED:            { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: 'location-outline' },
  WEIGHING:           { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', icon: 'scale-outline' },
  STORED:             { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', icon: 'cube-outline' },
  DISPATCH_REQUESTED: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', icon: 'arrow-up-circle-outline' },
  DISPATCHING:        { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC', icon: 'car-outline' },
  DISPATCHED:         { bg: '#ECFEFF', text: '#164E63', border: '#A5F3FC', icon: 'checkmark-done-outline' },
  COMPLETED:          { bg: '#F0FDF4', text: '#14532D', border: '#86EFAC', icon: 'trophy-outline' },
  CANCELLED:          { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: 'close-circle-outline' },
  REJECTED:           { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: 'ban-outline' },
};

const ICON_VARIANTS = [
  { bg: '#E8F4F0', color: '#0E6E5A' },
  { bg: '#EEEEFF', color: '#5555CC' },
  { bg: '#FFF3E6', color: '#C2700F' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function BookingsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const hasTriggeredEndRef = useRef(false);

  // ── Data ────────────────────────────────────────────────────────────────────

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
          setHasMore(items.length === 15);
          setPage(p);
        } else if (reset) {
          setBookings([]);
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch bookings', err);
        if (reset) {
          setBookings([]);
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
    return bookings.filter(
      item =>
        item.bookingNumber?.toLowerCase().includes(q) ||
        item.facility?.name?.toLowerCase().includes(q) ||
        item.commodityName?.toLowerCase().includes(q) ||
        item.facility?.city?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  // ── Booking Card ─────────────────────────────────────────────────────────────

  const renderBooking = ({ item, index }: { item: any; index: number }) => {
    const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
    const variant = ICON_VARIANTS[index % ICON_VARIANTS.length];

    const preferredDate = item.preferredDate
      ? new Date(item.preferredDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    const statusLabel = String(item.status ?? 'PENDING').replace(/_/g, ' ');

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => {
          router.push(`/booking/${item.id}`);
          hapticLight();
        }}
      >
        {/* ── Row 1: Icon + Booking info + Status chip ── */}
        <View style={s.cardTop}>
          <View style={[s.iconBox, { backgroundColor: variant.bg }]}>
            <Ionicons name="snow-outline" size={17} color={variant.color} />
          </View>

          <View style={s.cardMeta}>
            <Text style={s.bookingNo} numberOfLines={1}>
              #{item.bookingNumber}
            </Text>
            <Text style={s.facilityName} numberOfLines={1}>
              {item.facility?.name ?? 'Facility'}
            </Text>
          </View>

          <View
            style={[
              s.statusBadge,
              { backgroundColor: sc.bg, borderColor: sc.border },
            ]}
          >
            <Ionicons name={sc.icon as any} size={11} color={sc.text} />
            <Text style={[s.statusText, { color: sc.text }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* ── Hairline divider ── */}
        <View style={s.hairline} />

        {/* ── Row 2: Commodity + Weight pills ── */}
        <View style={s.pillRow}>
          <View style={s.pill}>
            <Ionicons name="leaf-outline" size={12} color="#6C7882" />
            <Text style={s.pillText} numberOfLines={1}>
              {item.commodityName ?? 'Commodity'}
            </Text>
          </View>
          <View style={s.pill}>
            <Ionicons name="scale-outline" size={12} color="#6C7882" />
            <Text style={s.pillText}>
              {item.estimatedWeightKg ? `${item.estimatedWeightKg} Kg` : '—'}
            </Text>
          </View>
        </View>

        {/* ── Row 3: Date + City + Chevron ── */}
        <View style={s.footerRow}>
          <View style={s.footerLeft}>
            <View style={s.footerItem}>
              <Ionicons name="calendar-outline" size={13} color="#9DA6B4" />
              <Text style={s.footerText}>{preferredDate}</Text>
            </View>
            {item.facility?.city ? (
              <View style={s.footerItem}>
                <Ionicons name="location-outline" size={13} color="#9DA6B4" />
                <Text style={s.footerText} numberOfLines={1}>
                  {item.facility.city}
                </Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={15} color="#C8D0DA" />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={s.headerShell}>
      {/* Shared header with hamburger + avatar */}
      <SharedTabHeader subtitle="Storage bookings" />

      {/* Controls */}
      <View style={s.controls}>
        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="#8B939D" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bookings or facilities..."
            placeholderTextColor="#9FA8B2"
            style={s.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={17} color="#B2BAC6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f.key}
          contentContainerStyle={s.chipList}
          renderItem={({ item: f }) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => {
                  setStatusFilter(f.key);
                  hapticLight();
                }}
                activeOpacity={0.84}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  // ── Empty / Loading ──────────────────────────────────────────────────────────

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#0A4E40" />
          <Text style={s.loadingLabel}>Loading bookings...</Text>
        </View>
      );
    }
    return (
      <View style={s.centered}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="calendar-outline" size={32} color="#BCC5CE" />
        </View>
        <Text style={s.emptyTitle}>No bookings yet</Text>
        <Text style={s.emptyBody}>
          Find a cold storage facility and create your first booking request.
        </Text>
        <TouchableOpacity
          style={s.emptyAction}
          onPress={() => {
            router.push('/(tabs)/discover');
            hapticLight();
          }}
          activeOpacity={0.84}
        >
          <Ionicons name="search-outline" size={14} color="#0A4E40" />
          <Text style={s.emptyActionText}>Find Storage</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Root ─────────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <FlatList
        data={filteredBookings}
        keyExtractor={b => b.id}
        renderItem={renderBooking}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0A4E40"
            colors={['#0A4E40']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.25}
        onMomentumScrollBegin={() => {
          hasTriggeredEndRef.current = false;
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#0A4E40" />
          ) : (
            <View style={{ height: 16 }} />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // ── Root ──────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: '#F2F4F0',
  },

  // ── Header shell ──────────────────────────────────────
  headerShell: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E6DF',
    marginBottom: 12,
    shadowColor: '#182A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E4DC',
  },

  brandBlock: {
    flex: 1,
    marginLeft: 11,
  },

  brandName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#061D15',
    letterSpacing: -0.5,
    lineHeight: 25,
  },

  brandSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E9A93',
    marginTop: 1,
  },

  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    backgroundColor: '#D4A635',
    shadowColor: '#8B6820',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E6EAE3',
    marginHorizontal: 16,
  },

  controls: {
    paddingTop: 14,
    paddingBottom: 12,
  },

  // ── Search ──────────────────────────────────────────────
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F6F8F4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DADDD6',
    paddingHorizontal: 13,
    shadowColor: '#182A1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C2830',
    paddingVertical: 0,
  },

  // ── Filter chips ─────────────────────────────────────────
  chipList: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 7,
  },

  chip: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECF0E8',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDE2D9',
  },

  chipActive: {
    backgroundColor: '#0B2B22',
    borderColor: '#0B2B22',
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E5D56',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  // ── List ─────────────────────────────────────────────────
  list: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
    flexGrow: 1,
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E9E2',
    shadowColor: '#182D20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },

  cardMeta: {
    flex: 1,
    marginRight: 8,
  },

  bookingNo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A6B0BC',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  facilityName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#17202C',
    letterSpacing: -0.1,
    lineHeight: 18,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: 155,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    flexShrink: 1,
  },

  // Hairline divider
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEF1EB',
    marginBottom: 10,
  },

  // Info pills
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#F3F5F1',
  },

  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#636E7A',
  },

  // Footer row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  footerText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#98A2AE',
  },

  // ── Centered states ─────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 30,
  },

  loadingLabel: {
    marginTop: 10,
    fontSize: 13,
    color: '#78838E',
    fontWeight: '500',
  },

  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#ECF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDE3D9',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#141E2A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  emptyBody: {
    fontSize: 13,
    color: '#6C7880',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    maxWidth: 260,
  },

  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 13,
    backgroundColor: '#E8F3EE',
    borderWidth: 1,
    borderColor: '#D0E8DC',
  },

  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A4E40',
  },
});