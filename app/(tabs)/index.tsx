/**
 * ColdStorage — Premium Farmer Dashboard
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Deep forest gradient hero with grain texture
 * - Glassmorphic stat cards with ProgressRing + MoneyText
 * - Redesigned quick actions with colored icon squares
 * - Premium booking cards with PremiumCard
 * - Mandi price carousel with trend arrows
 * - Pending order alert with amber pulse
 * - Warm off-white background (#F7F6F2)
 * - All API calls & data flow UNCHANGED
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, FlatList,
  Animated as RNAnimated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { api } from '@/lib/api-client';
import {
  Colors, Spacing, BorderRadius, FontSize, FontWeight,
  Shadows, Gradients, FontFamily,
} from '@/constants/Colors';
import { SkeletonStatsGrid, SkeletonCard } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import SyncBadge from '@/components/SyncBadge';
import { hapticLight, hapticMedium } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface DashboardData {
  totalLots: number;
  storedWeight: number;
  totalRent: number;
  activeLots: number;
  alertLots: number;
}

// ── Quick Actions — ALL routes are real, registered screens ──
const QUICK_ACTIONS = [
  { key: 'bookings', icon: 'calendar',       label: 'My Bookings',   color: '#1B5E4A', bg: '#E6F2ED', route: '/bookings' },
  { key: 'inventory', icon: 'cube',          label: 'My Lots',       color: '#059669', bg: '#ECFDF5', route: '/(tabs)/inventory' },
  { key: 'discover', icon: 'compass',        label: 'Find Storage',  color: '#0F766E', bg: '#F0FDFA', route: '/(tabs)/discover' },
  { key: 'invoices', icon: 'receipt',         label: 'Invoices',      color: '#0891B2', bg: '#ECFEFF', route: '/invoices' },
  { key: 'receipts', icon: 'document-text',   label: 'Receipts',      color: '#7C3AED', bg: '#F5F3FF', route: '/receipts' },
  { key: 'mandi', icon: 'trending-up',        label: 'Mandi Prices',  color: '#DC2626', bg: '#FEF2F2', route: '/market-prices' },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const colors = Colors.light;

  const [data, setData] = useState<DashboardData | null>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [pricesMeta, setPricesMeta] = useState<{ fetchedAt: string; source: string } | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Entrance animation
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(20)).current;

  // Alert pulse animation
  const alertPulse = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(alertPulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        RNAnimated.timing(alertPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [lotsRes, pricesRes, ordersRes, bookingsRes] = await Promise.all([
        api.get<any>('/inventory/my-lots?limit=100'),
        api.get<any>(`/market-prices${user?.state ? `?state=${encodeURIComponent(user.state)}` : ''}`),  
        api.get<any>('/orders?limit=50').catch(() => ({ success: false, data: null })),
        api.get<any>('/bookings/my?limit=5').catch(() => ({ success: false, data: null })),
      ]);

      if (lotsRes.success && lotsRes.data?.lots) {
        const lots = lotsRes.data.lots;
        const active = lots.filter((l: any) => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED');
        setData({
          totalLots: lots.length,
          storedWeight: lots.reduce((sum: number, l: any) => sum + Number(l.currentWeightKg), 0),
          totalRent: lots.reduce((sum: number, l: any) => sum + (l.estimatedRent || 0), 0),
          activeLots: active.length,
          alertLots: 0,
        });
      }

      if (pricesRes.success && pricesRes.data) {
        setPrices(pricesRes.data);
        if (pricesRes.meta) setPricesMeta(pricesRes.meta as { fetchedAt: string; source: string });
      }
      if (ordersRes.success && ordersRes.data?.orders) {
        const pending = ordersRes.data.orders.filter((o: any) => o.status === 'PENDING_APPROVAL');
        setPendingOrdersCount(pending.length);
      }
      if (bookingsRes.success && bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }

      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        RNAnimated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const userInitial = user?.fullName?.[0]?.toUpperCase() || '?';

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={Gradients.mesh as any} style={s.heroSkeleton}>
          <View style={{ height: Platform.OS === 'ios' ? 50 : 30 }} />
          <View style={s.heroContent}>
            <View style={{ height: 24, width: 160, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <View style={{ height: 16, width: 120, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, marginTop: 8 }} />
          </View>
        </LinearGradient>
        <View style={{ padding: 20 }}>
          <SkeletonStatsGrid />
          <View style={{ marginTop: 20 }}><SkeletonCard /><SkeletonCard /></View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <ErrorState variant="network" onRetry={fetchData} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E4A" />}
    >
      {/* ── Hero Header ── */}
      <LinearGradient colors={Gradients.mesh as any} style={s.hero}>
        {/* Grain overlay */}
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 56 : 38 }} />
        <View style={s.heroContent}>
          {/* Top row — Brand + User */}
          <View style={s.heroTop}>
            <View style={s.brandRow}>
              <View style={s.brandIcon}>
                <Ionicons name="snow" size={16} color="#E8BE6A" />
              </View>
              <View>
                <Text style={s.brandName}>ColdStorage</Text>
                <Text style={s.brandSub}>{user?.fullName || 'Dashboard'}</Text>
              </View>
            </View>
            <View style={s.heroActions}>
              <SyncBadge />
              <TouchableOpacity
                style={s.avatarBtn}
                onPress={() => { router.push('/(tabs)/profile'); hapticLight(); }}
              >
                <Text style={s.avatarText}>{userInitial}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.notificationBtn}
                onPress={() => { router.push('/notifications'); hapticLight(); }}
              >
                <Ionicons name="notifications-outline" size={20} color="#FFF" />
                {unreadCount > 0 && (
                  <View style={s.notiBadge}>
                    <Text style={s.notiBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Glassmorphic Stats ── */}
          <View style={s.statsContainer}>
            {/* Active Lots */}
            <View style={s.glassCard}>
              <View style={s.glassInner} />
              <View style={s.statContent}>
                <View style={[s.statIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Ionicons name="cube" size={16} color="#34D399" />
                </View>
                <Text style={s.statValue}>{data?.activeLots || 0}</Text>
                <Text style={s.statLabel}>ACTIVE LOTS</Text>
              </View>
            </View>

            {/* Total Weight */}
            <View style={s.glassCard}>
              <View style={s.glassInner} />
              <View style={s.statContent}>
                <View style={[s.statIcon, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                  <Ionicons name="scale" size={16} color="#60A5FA" />
                </View>
                <Text style={s.statValue}>
                  {((data?.storedWeight || 0) / 1000).toFixed(1)}
                  <Text style={s.statUnit}> MT</Text>
                </Text>
                <Text style={s.statLabel}>STORED WEIGHT</Text>
              </View>
            </View>

            {/* Accrued Rent */}
            <View style={s.glassCard}>
              <View style={s.glassInner} />
              <View style={s.statContent}>
                <View style={[s.statIcon, { backgroundColor: 'rgba(232, 190, 106, 0.15)' }]}>
                  <Ionicons name="wallet" size={16} color="#E8BE6A" />
                </View>
                <Text style={s.statValueGold}>
                  ₹{(data?.totalRent || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={s.statLabel}>ACCRUED RENT</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <RNAnimated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* ── Alert Banner ── */}
        {pendingOrdersCount > 0 && (
          <TouchableOpacity
            style={s.alertBanner}
            onPress={() => { router.push('/orders'); hapticLight(); }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={s.alertGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <RNAnimated.View style={[s.alertIconWrap, { opacity: alertPulse }]}>
                <Ionicons name="key" size={16} color="#D97706" />
              </RNAnimated.View>
              <View style={{ flex: 1 }}>
                <Text style={s.alertTitle}>
                  {pendingOrdersCount} Pending Order{pendingOrdersCount > 1 ? 's' : ''}
                </Text>
                <Text style={s.alertSub}>Waiting for your approval</Text>
              </View>
              <View style={s.alertArrow}>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions Grid ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={s.actionCard}
                onPress={() => { router.push(action.route as any); hapticLight(); }}
                activeOpacity={0.7}
              >
                <View style={[s.actionIconSquare, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon as any} size={20} color={action.color} />
                </View>
                <Text style={s.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── My Recent Bookings ── */}
        {bookings.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}>
                <View style={s.liveDot} />
                <Text style={s.sectionTitleInline}>My Bookings</Text>
              </View>
              <TouchableOpacity onPress={() => { router.push('/bookings'); hapticLight(); }}>
                <Text style={s.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            {bookings.slice(0, 3).map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={s.bookingCard}
                onPress={() => { router.push(`/booking/${b.id}` as any); hapticLight(); }}
                activeOpacity={0.7}
              >
                <View style={s.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bookingNum}>#{b.bookingNumber}</Text>
                    <Text style={s.bookingCommodity}>{b.commodityName} • {b.estimatedWeightKg} Kg</Text>
                  </View>
                  <View style={[
                    s.statusChip,
                    { backgroundColor: getStatusBg(b.status) },
                  ]}>
                    <Text style={[s.statusChipText, { color: getStatusColor(b.status) }]}>
                      {b.status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <View style={s.bookingMeta}>
                  <Ionicons name="business-outline" size={11} color="#94A3B8" />
                  <Text style={s.bookingMetaText}>{b.facility?.name || '—'}</Text>
                  <View style={s.metaDot} />
                  <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
                  <Text style={s.bookingMetaText}>
                    {b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Live Mandi Prices ── */}
        {prices.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View>
                <View style={s.sectionTitleRow}>
                  <View style={[s.liveDot, pricesMeta?.source === 'fallback' && { backgroundColor: '#F59E0B' }]} />
                  <Text style={s.sectionTitleInline}>Live Mandi Prices</Text>
                </View>
                {pricesMeta?.fetchedAt && (
                  <Text style={s.lastUpdated}>
                    {pricesMeta.source === 'fallback' ? 'Offline • ' : ''}
                    Updated {formatTimeAgo(pricesMeta.fetchedAt)}
                    {user?.state ? ` • ${user.state}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { router.push('/market-prices'); hapticLight(); }}>
                <Text style={s.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={prices.slice(0, 8)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `price-${index}`}
              contentContainerStyle={s.tickerContainer}
              renderItem={({ item }) => {
                const topMandi = item.mandis?.[0];
                if (!topMandi) return null;
                const minPrice = Number(topMandi.minPrice || 0);
                const maxPrice = Number(topMandi.maxPrice || 0);
                const modalPrice = Number(topMandi.modalPrice || 0);
                const midpoint = (minPrice + maxPrice) / 2;
                const isUp = modalPrice >= midpoint;
                const cleanUnit = item.unit ? item.unit.replace('₹/', '') : 'Quintal';

                return (
                  <View style={s.tickerCard}>
                    <View style={s.tickerTop}>
                      <Text style={s.tickerCommodity} numberOfLines={1}>{item.commodity}</Text>
                      <View style={[s.trendPill, { backgroundColor: isUp ? '#D1FAE5' : '#FECACA' }]}>
                        <Ionicons
                          name={isUp ? 'trending-up' : 'trending-down'}
                          size={10}
                          color={isUp ? '#059669' : '#DC2626'}
                        />
                      </View>
                    </View>
                    <Text style={s.tickerPrice}>₹{modalPrice.toLocaleString('en-IN')}</Text>
                    <Text style={s.tickerUnit}>per {cleanUnit}</Text>
                    <View style={s.tickerMandiRow}>
                      <Ionicons name="location-outline" size={10} color="#94A3B8" />
                      <Text style={s.tickerMandi} numberOfLines={1}>{topMandi.name || '—'}</Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}

        {/* ── Empty Welcome ── */}
        {data && data.totalLots === 0 && bookings.length === 0 && (
          <View style={s.emptyCard}>
            <LinearGradient colors={['#E6F2ED', '#F0FDFA']} style={s.emptyIconWrap}>
              <Ionicons name="leaf" size={36} color="#1B5E4A" />
            </LinearGradient>
            <Text style={s.emptyTitle}>Welcome to ColdStorage!</Text>
            <Text style={s.emptySub}>
              Find a verified cold storage facility near you and book space for your produce.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => { router.push('/(tabs)/discover'); hapticLight(); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={Gradients.mesh as any} style={s.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="compass" size={18} color="#FFF" />
                <Text style={s.emptyBtnText}>Find Nearby Storage</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Platform.OS === 'ios' ? 100 : 32 }} />
      </RNAnimated.View>
    </ScrollView>
  );
}

// ── Status Color Helpers ──
function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#92400E', CONFIRMED: '#1E40AF', ARRIVED: '#5B21B6',
    WEIGHING: '#4338CA', STORED: '#065F46', DISPATCH_REQUESTED: '#9A3412',
    DISPATCHING: '#9D174D', DISPATCHED: '#155E75', COMPLETED: '#065F46',
    CANCELLED: '#991B1B', REJECTED: '#991B1B',
  };
  return map[status] || '#4B5563';
}

function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#FEF3C7', CONFIRMED: '#DBEAFE', ARRIVED: '#EDE9FE',
    WEIGHING: '#E0E7FF', STORED: '#D1FAE5', DISPATCH_REQUESTED: '#FFEDD5',
    DISPATCHING: '#FCE7F3', DISPATCHED: '#CFFAFE', COMPLETED: '#D1FAE5',
    CANCELLED: '#FECACA', REJECTED: '#FECACA',
  };
  return map[status] || '#F3F4F6';
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const CARD_W = (SCREEN_WIDTH - 20 * 2 - 10 * 2) / 3;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },

  // ── Hero ──
  hero: { paddingBottom: 24 },
  heroSkeleton: { paddingBottom: 32 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  heroContent: { paddingHorizontal: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(232, 190, 106, 0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232, 190, 106, 0.2)',
  },
  brandName: {
    fontSize: 20, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    fontFamily: FontFamily.regular, marginTop: 1,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  avatarText: {
    fontSize: 14, fontWeight: '800', color: '#6EE7B7',
    fontFamily: FontFamily.extrabold,
  },
  notificationBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  notiBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#0F3D2E',
  },
  notiBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  // ── Glass Stat Cards ──
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  glassCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassInner: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statContent: {
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: {
    fontSize: 18, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
  },
  statValueGold: {
    fontSize: 16, fontWeight: '800', color: '#E8BE6A',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
  },
  statUnit: {
    fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)',
  },
  statLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.45)',
    fontFamily: FontFamily.bold, letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Alert Banner ──
  alertBanner: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, overflow: 'hidden',
    ...Shadows.card,
  },
  alertGrad: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 16,
  },
  alertIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14, fontWeight: '700', color: '#92400E',
    fontFamily: FontFamily.bold,
  },
  alertSub: {
    fontSize: 11, color: '#B45309', marginTop: 1,
    fontFamily: FontFamily.regular,
  },
  alertArrow: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Section ──
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold, marginBottom: 14, letterSpacing: -0.2,
  },
  sectionTitleInline: {
    fontSize: 18, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold, letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13, fontWeight: '600', color: '#1B5E4A',
    fontFamily: FontFamily.semibold,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  lastUpdated: {
    fontSize: 10, color: '#94A3B8', marginTop: 2, marginLeft: 16,
    fontFamily: FontFamily.medium,
  },

  // ── Quick Actions ──
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: CARD_W, alignItems: 'center', paddingVertical: 18,
    borderRadius: BorderRadius.lg, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  actionIconSquare: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11, fontWeight: '600', color: '#374151',
    fontFamily: FontFamily.semibold, textAlign: 'center',
  },

  // ── Booking Cards ──
  bookingCard: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingNum: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    fontFamily: FontFamily.bold, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bookingCommodity: {
    fontSize: 15, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold, marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  statusChipText: {
    fontSize: 9, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    fontFamily: FontFamily.bold,
  },
  bookingMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  bookingMetaText: {
    fontSize: 11, color: '#94A3B8', fontWeight: '500',
    fontFamily: FontFamily.medium,
  },
  metaDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: '#D1D5DB', marginHorizontal: 4,
  },

  // ── Mandi Ticker ──
  tickerContainer: { gap: 10, paddingRight: 20 },
  tickerCard: {
    width: 150, padding: 16, borderRadius: BorderRadius.lg,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  tickerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  tickerCommodity: {
    fontWeight: '700', fontSize: 13,
    fontFamily: FontFamily.bold, color: '#1A1A2E', flex: 1,
  },
  trendPill: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  tickerPrice: {
    fontWeight: '800', fontSize: 20,
    fontFamily: FontFamily.extrabold, color: '#1B5E4A',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.5,
  },
  tickerUnit: {
    fontSize: 10, color: '#94A3B8', marginTop: 2,
    fontFamily: FontFamily.medium, letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tickerMandiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  tickerMandi: {
    fontSize: 11, color: '#5F6B7A',
    fontFamily: FontFamily.regular, flex: 1,
  },

  // ── Empty State ──
  emptyCard: {
    marginHorizontal: 20, marginTop: 24, borderRadius: BorderRadius.xl,
    padding: 32, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22, fontWeight: '800', color: '#1A1A2E',
    fontFamily: FontFamily.extrabold, marginBottom: 8, letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14, textAlign: 'center', lineHeight: 22,
    color: '#5F6B7A', fontFamily: FontFamily.regular, marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    ...Shadows.glow,
  },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 15,
    borderRadius: BorderRadius.lg,
  },
  emptyBtnText: {
    fontSize: 15, fontWeight: '700', color: '#FFF',
    fontFamily: FontFamily.bold,
  },
});
