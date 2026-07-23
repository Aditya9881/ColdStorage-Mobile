/**
 * ColdStorage — Bookings Tab
 *
 * Refined premium mobile version:
 * - Better sizing and spacing
 * - Removed oversized hero feel
 * - More compact search, chips, and cards
 * - Better proportions for a premium mobile UI
 * - Booking logic, API, pagination, refresh preserved
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
  PENDING: { bg: '#FDE7B8', text: '#B96B14', icon: 'hourglass-outline', soft: '#FFF8ED' },
  CONFIRMED: { bg: '#CAECDC', text: '#0A8660', icon: 'checkmark-circle-outline', soft: '#F1FBF6' },
  ARRIVED: { bg: '#DCEAFE', text: '#2563EB', icon: 'location-outline', soft: '#F3F7FF' },
  WEIGHING: { bg: '#ECE6FF', text: '#7C3AED', icon: 'scale-outline', soft: '#F7F5FF' },
  STORED: { bg: '#CFF1E8', text: '#0E7B71', icon: 'cube-outline', soft: '#F1FCF8' },
  DISPATCH_REQUESTED: { bg: '#F7DEC9', text: '#C66A25', icon: 'arrow-up-circle-outline', soft: '#FFF8F3' },
  DISPATCHING: { bg: '#D6F3F7', text: '#0E7490', icon: 'car-outline', soft: '#F1FCFD' },
  DISPATCHED: { bg: '#D6F3F7', text: '#155E75', icon: 'checkmark-done-outline', soft: '#F1FCFD' },
  COMPLETED: { bg: '#D8F1DE', text: '#1E9A63', icon: 'trophy-outline', soft: '#F2FBF5' },
  CANCELLED: { bg: '#FDE0E0', text: '#D03030', icon: 'close-circle-outline', soft: '#FEF3F3' },
  REJECTED: { bg: '#FDE0E0', text: '#D03030', icon: 'ban-outline', soft: '#FEF3F3' },
};

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

    return bookings.filter(item =>
      item.bookingNumber?.toLowerCase().includes(q) ||
      item.facility?.name?.toLowerCase().includes(q) ||
      item.commodityName?.toLowerCase().includes(q) ||
      item.facility?.city?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

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
        activeOpacity={0.86}
        onPress={() => {
          router.push(`/booking/${item.id}`);
          hapticLight();
        }}
      >
        <View style={s.cardTop}>
          <View style={s.cardLeft}>
            <View style={[s.cardIcon, { backgroundColor: index % 2 === 0 ? '#E6F3EE' : '#EEF0FD' }]}>
              <Ionicons
                name="snow-outline"
                size={18}
                color={index % 2 === 0 ? '#167B67' : '#6666D8'}
              />
            </View>

            <View style={s.cardMain}>
              <Text style={s.bookingNo} numberOfLines={1}>
                #{item.bookingNumber}
              </Text>
              <Text style={s.facilityName} numberOfLines={1}>
                {item.facility?.name || 'Facility'}
              </Text>
            </View>
          </View>

          <View style={[s.statusChip, { backgroundColor: sc.soft, borderColor: sc.bg }]}>
            <Ionicons name={sc.icon as any} size={12} color={sc.text} />
            <Text style={[s.statusChipText, { color: sc.text }]} numberOfLines={1}>
              {String(item.status || 'PENDING').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.infoPill}>
            <Ionicons name="leaf-outline" size={13} color="#7B8693" />
            <Text style={s.infoPillText} numberOfLines={1}>
              {item.commodityName || 'Commodity'}
            </Text>
          </View>

          <View style={s.infoPill}>
            <Ionicons name="scale-outline" size={13} color="#7B8693" />
            <Text style={s.infoPillText}>{item.estimatedWeightKg || 0} Kg</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#A0A8B4" />
            <Text style={s.metaText}>{preferredDate}</Text>
          </View>

          {item.facility?.city ? (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={14} color="#A0A8B4" />
              <Text style={s.metaText} numberOfLines={1}>
                {item.facility.city}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.cardArrow}>
          <Ionicons name="chevron-forward" size={17} color="#B3BAC5" />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={s.headerWrap}>
      <LinearGradient
        colors={['#FFFFFF', '#FBFCFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[s.topShell, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.84} onPress={hapticLight}>
            <Ionicons name="menu" size={24} color="#062F27" />
          </TouchableOpacity>

          <View style={s.brandWrap}>
            <Text style={s.brandText}>SheetKosh</Text>
            <Text style={s.brandSub}>Storage bookings</Text>
          </View>

          <TouchableOpacity style={s.avatarRing} activeOpacity={0.86} onPress={hapticLight}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/120?img=12' }}
              style={s.avatar}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.heroSection}>
        <View style={s.heroBadge}>
          <View style={s.heroBadgeDot} />
          <Text style={s.heroBadgeText}>Manage your requests</Text>
        </View>

        <Text style={s.pageTitle}>My Bookings</Text>

        <Text style={s.pageSubTitle}>
          Track booking progress, storage activity, and dispatch updates in one place.
        </Text>

        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <View style={s.searchIconWrap}>
              <Ionicons name="search-outline" size={20} color="#7E848D" />
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search bookings or facilities..."
              placeholderTextColor="#8E949C"
              style={s.searchInput}
            />

            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.82}>
                <Ionicons name="close-circle" size={18} color="#A1A7AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

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
                activeOpacity={0.86}
              >
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {loading ? (
        <FlatList
          data={[]}
          ListHeaderComponent={<ListHeader />}
          renderItem={null}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <View style={s.center}>
              <ActivityIndicator size="large" color="#0A4E40" />
              <Text style={s.loadingLabel}>Loading bookings...</Text>
            </View>
          }
        />
      ) : filteredBookings.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={s.center}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={38} color="#C6CCD4" />
              </View>
              <Text style={s.emptyTitle}>No bookings yet</Text>
              <Text style={s.emptyText}>
                Find a cold storage facility and create your first booking request.
              </Text>
              <TouchableOpacity
                style={s.discoverBtn}
                onPress={() => {
                  router.push('/(tabs)/discover');
                  hapticLight();
                }}
                activeOpacity={0.84}
              >
                <Ionicons name="search-outline" size={15} color="#0A4E40" />
                <Text style={s.discoverBtnText}>Find Storage</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0A4E40"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 108 : 90 }}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={b => b.id}
          renderItem={renderBooking}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0A4E40"
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
              <ActivityIndicator style={{ marginVertical: 18 }} color="#0A4E40" />
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
    backgroundColor: '#F5F6F2',
  },

  headerWrap: {
    marginBottom: 8,
  },

  topShell: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFE8',
  },

  topBar: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F0',
    borderWidth: 1,
    borderColor: '#E4E9E1',
  },

  brandWrap: {
    flex: 1,
    marginLeft: 12,
  },

  brandText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: '#062F27',
    letterSpacing: -0.5,
  },

  brandSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#86908B',
    fontWeight: '500',
  },

  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#D8B24A',
    shadowColor: '#9E7B24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  heroSection: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 6,
  },

  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EAF4EF',
    borderWidth: 1,
    borderColor: '#DAEAE2',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0B8A68',
    marginRight: 8,
  },

  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#175A4B',
    letterSpacing: 0.2,
  },

  pageTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: '#052F25',
    letterSpacing: -1.2,
  },

  pageSubTitle: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 20,
    color: '#71807A',
    paddingRight: 14,
  },

  searchWrap: {
    marginTop: 16,
    marginBottom: 14,
  },

  searchBox: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#FCFCFA',
    borderWidth: 1,
    borderColor: '#DCE2DA',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#203128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },

  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F1',
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#26313A',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },

  filterContent: {
    paddingRight: 18,
    gap: 9,
    paddingBottom: 2,
  },

  filterChip: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EAE3',
    borderWidth: 1,
    borderColor: '#E2E5DE',
  },

  filterChipActive: {
    backgroundColor: '#062F27',
    borderColor: '#062F27',
  },

  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#54605B',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 92,
  },

  bookingCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8ECE7',
    shadowColor: '#183127',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  cardMain: {
    flex: 1,
  },

  bookingNo: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#A5AEBA',
    letterSpacing: 0.45,
    marginBottom: 2,
  },

  facilityName: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1A2232',
  },

  statusChip: {
    maxWidth: 170,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  statusChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    flexShrink: 1,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#F5F7F5',
  },

  infoPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#697482',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaText: {
    fontSize: 11.5,
    color: '#9FA8B4',
    fontWeight: '600',
  },

  cardArrow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  loadingLabel: {
    marginTop: 10,
    fontSize: 13,
    color: '#75808A',
  },

  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#EEF2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#152234',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13,
    color: '#748089',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },

  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#E7F5EF',
    borderWidth: 1,
    borderColor: '#D6EAE0',
  },

  discoverBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A4E40',
  },
});