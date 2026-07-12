/**
 * ColdStorage — Premium Marketplace Screen
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Tab toggle: Browse / My Listings
 * - SearchBar with commodity filters
 * - Premium listing cards with grade badge, MoneyText price
 * - Warm off-white background with refined shadows
 * - All API calls UNCHANGED
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, useColorScheme, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import {
  Colors, Spacing, BorderRadius, FontSize, FontWeight,
  Shadows, Gradients, FontFamily,
} from '@/constants/Colors';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const STATUS_CONFIGS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:    { label: 'Active',    color: '#065F46', bg: '#D1FAE5', border: '#A7F3D0' },
  SOLD:      { label: 'Sold',      color: '#155E75', bg: '#CFFAFE', border: '#A5F3FC' },
  EXPIRED:   { label: 'Expired',   color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
  CANCELLED: { label: 'Cancelled', color: '#991B1B', bg: '#FECACA', border: '#FCA5A5' },
};

const GRADE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'Premium', color: '#92400E', bg: '#FBF5E8' },
  B: { label: 'Grade A', color: '#065F46', bg: '#D1FAE5' },
  C: { label: 'Standard', color: '#4B5563', bg: '#F3F4F6' },
};

export default function MarketplaceScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [listings, setListings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchListings = useCallback(async () => {
    try {
      setError(false);
      const [browseRes, myRes] = await Promise.all([
        api.get<any>('/marketplace/listings?limit=30'),
        api.get<any>('/marketplace/my-listings'),
      ]);
      if (browseRes.success) setListings(browseRes.data?.listings || []);
      if (myRes.success) setMyListings(myRes.data || []);
    } catch (err) {
      console.error('Marketplace fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const data = useMemo(() => {
    const source = tab === 'browse' ? listings : myListings;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter((item: any) =>
      item.lot?.commodityName?.toLowerCase().includes(q) ||
      item.lot?.lotNumber?.toLowerCase().includes(q)
    );
  }, [tab, listings, myListings, search]);

  const daysAgo = (date: string) => {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={Gradients.mesh as any} style={s.header}>
          <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
          <Text style={s.headerTitle}>Marketplace</Text>
        </LinearGradient>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <ErrorState variant="network" onRetry={fetchListings} />
      </View>
    );
  }

  const renderListing = ({ item }: { item: any }) => {
    const statusConfig = STATUS_CONFIGS[item.status] || STATUS_CONFIGS.ACTIVE;
    const grade = item.lot?.qualityGrade || '—';
    const gradeConfig = GRADE_LABELS[grade];
    const days = daysAgo(item.createdAt);
    const weight = Number(item.lot?.currentWeightKg || 0);
    const pricePerKg = Number(item.askingPricePerKg || 0);

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { router.push(`/listing/${item.id}`); hapticLight(); }}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={[s.commodityIcon, { backgroundColor: `${statusConfig.color}10` }]}>
            <Ionicons name="leaf" size={22} color={statusConfig.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.commodityName} numberOfLines={1}>
              {item.lot?.commodityName || 'Unknown'}
            </Text>
            <Text style={s.lotNum}>{item.lot?.lotNumber || '—'}</Text>
          </View>
          {/* Price — hero element */}
          <View style={s.priceWrap}>
            <Text style={s.priceValue}>₹{pricePerKg.toLocaleString('en-IN')}</Text>
            <Text style={s.priceUnit}>per kg</Text>
          </View>
        </View>

        {/* Info Chips Row */}
        <View style={s.chipsRow}>
          <View style={s.chip}>
            <Ionicons name="scale-outline" size={10} color="#5F6B7A" />
            <Text style={s.chipText}>{(weight / 1000).toFixed(1)} MT</Text>
          </View>
          {gradeConfig && (
            <View style={[s.chip, { backgroundColor: gradeConfig.bg }]}>
              <Text style={[s.chipText, { color: gradeConfig.color, fontWeight: '700' }]}>
                {gradeConfig.label}
              </Text>
            </View>
          )}
          <View style={[s.chip, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
            <Text style={[s.chipText, { color: statusConfig.color, fontWeight: '700' }]}>
              {statusConfig.label}
            </Text>
          </View>
          {days > 0 && (
            <View style={s.chip}>
              <Ionicons name="time-outline" size={10} color="#94A3B8" />
              <Text style={[s.chipText, { color: '#94A3B8' }]}>{days}d ago</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* ── Premium Header ── */}
      <LinearGradient colors={Gradients.mesh as any} style={s.header}>
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>Marketplace</Text>
          {tab === 'mine' && (
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => { router.push('/listing/create'); hapticLight(); }}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={s.createBtnText}>New Listing</Text>
            </TouchableOpacity>
          )}
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search commodity, lot number..." />
      </LinearGradient>

      {/* ── Tab Toggle ── */}
      <View style={s.tabRow}>
        {(['browse', 'mine'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => { setTab(t); hapticSelection(); }}
          >
            <Ionicons
              name={t === 'browse' ? 'storefront-outline' : 'pricetag-outline'}
              size={14}
              color={tab === t ? '#1B5E4A' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'browse' ? `Browse (${listings.length})` : `My Listings (${myListings.length})`}
            </Text>
            {tab === t && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Listings ── */}
      <FlatList
        data={data}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E4A" />}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'mine' ? 'pricetag-outline' : 'storefront-outline'}
            title={search ? 'No results' : tab === 'mine' ? 'No Listings Yet' : 'No Listings Available'}
            subtitle={
              search ? 'Try a different search term'
                : tab === 'mine'
                  ? 'List your stored produce for sale and reach thousands of buyers.'
                  : 'Check back soon for new produce listings.'
            }
            action={tab === 'mine' ? { label: 'Create Listing', onPress: () => router.push('/listing/create') } : undefined}
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },

  // ── Header ──
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, letterSpacing: -0.3,
  },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  createBtnText: {
    fontSize: 13, fontWeight: '600', color: '#FFF',
    fontFamily: FontFamily.semibold,
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8E6E1',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, position: 'relative',
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 13, fontWeight: '600', color: '#94A3B8',
    fontFamily: FontFamily.semibold,
  },
  tabTextActive: { color: '#1B5E4A' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2.5, borderRadius: 2, backgroundColor: '#1B5E4A',
  },

  list: {
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 32,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: '#E8E6E1',
    padding: 18, marginBottom: 12,
    ...Shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  commodityIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  commodityName: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },
  lotNum: {
    fontSize: 11, color: '#94A3B8', marginTop: 2,
    fontFamily: FontFamily.regular, letterSpacing: 0.3,
  },
  priceWrap: { alignItems: 'flex-end' },
  priceValue: {
    fontSize: 20, fontWeight: '800', color: '#D9A441',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 10, color: '#94A3B8', marginTop: 1,
    fontFamily: FontFamily.medium, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Chips ──
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E8E6E1',
  },
  chipText: {
    fontSize: 11, fontWeight: '500', color: '#5F6B7A',
    fontFamily: FontFamily.medium,
  },
});
