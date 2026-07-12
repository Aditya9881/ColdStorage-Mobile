/**
 * ColdStorage — Market Prices Screen (Full View)
 *
 * Live mandi prices from data.gov.in / AGMARKNET.
 * Auto-detects farmer's state from profile.
 * Shows "Last updated" with fallback indicator.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Colors, Spacing, BorderRadius, FontSize, FontWeight,
  Shadows, Gradients, FontFamily,
} from '@/constants/Colors';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { hapticLight, hapticSelection } from '@/lib/haptics';

interface MandiPrice {
  id: string;
  commodity: string;
  state: string;
  district: string;
  mandi: string;
  variety: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  arrivalDate: string;
  trend: 'up' | 'down' | 'stable';
}

interface PricesMeta {
  fetchedAt: string;
  source: 'live' | 'cached' | 'fallback';
  totalCommodities: number;
  totalMandis: number;
  filters: { state: string | null; district: string | null; commodity: string | null };
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MarketPricesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [meta, setMeta] = useState<PricesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCommodity, setSelectedCommodity] = useState('All');

  const fetchPrices = useCallback(async () => {
    try {
      setError(false);
      // Auto-detect location from farmer's profile
      const params = new URLSearchParams();
      if (user?.state) params.set('state', user.state);

      const url = `/market-prices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<any>(url);

      if (res.success && res.data) {
        // Transform API response into flat MandiPrice list
        const mapped: MandiPrice[] = [];
        for (const group of res.data) {
          const mandis = group.mandis || [];
          for (let i = 0; i < mandis.length; i++) {
            const m = mandis[i];
            const modalPrice = Number(m.modalPrice || 0);
            const minPrice = Number(m.minPrice || 0);
            const maxPrice = Number(m.maxPrice || 0);
            const midpoint = (minPrice + maxPrice) / 2;
            const trend: 'up' | 'down' | 'stable' =
              modalPrice > midpoint * 1.05 ? 'up' :
              modalPrice < midpoint * 0.95 ? 'down' : 'stable';

            mapped.push({
              id: `${group.commodity}-${m.name}-${i}`,
              commodity: group.commodity || 'Unknown',
              state: m.state || '—',
              district: m.district || '',
              mandi: m.name || '—',
              variety: m.variety || 'Other',
              minPrice,
              maxPrice,
              modalPrice,
              unit: group.unit || '₹/Quintal',
              arrivalDate: m.arrivalDate || group.date || '',
              trend,
            });
          }
        }
        setPrices(mapped);
        if (res.meta) setMeta(res.meta as PricesMeta);
      }
    } catch (err) {
      console.error('Market prices fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.state]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  };

  // Filter + Search
  const filteredPrices = React.useMemo(() => {
    let result = prices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.commodity.toLowerCase().includes(q) ||
        p.mandi.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
      );
    }
    if (selectedState !== 'All') {
      result = result.filter(p => p.state === selectedState);
    }
    if (selectedCommodity !== 'All') {
      result = result.filter(p => p.commodity === selectedCommodity);
    }
    return result;
  }, [prices, searchQuery, selectedState, selectedCommodity]);

  const statesList = ['All', ...Array.from(new Set(prices.map(p => p.state).filter(Boolean)))];
  const commoditiesList = ['All', ...Array.from(new Set(prices.map(p => p.commodity).filter(Boolean)))];

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={Gradients.mesh as any} style={s.header}>
          <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Mandi Prices</Text>
        </LinearGradient>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <ErrorState variant="network" onRetry={fetchPrices} />
      </View>
    );
  }

  const renderPriceItem = ({ item }: { item: MandiPrice }) => {
    const trendColor = item.trend === 'up' ? '#059669' : item.trend === 'down' ? '#DC2626' : '#6B7280';
    const trendBg = item.trend === 'up' ? '#D1FAE5' : item.trend === 'down' ? '#FECACA' : '#F3F4F6';
    const trendIcon = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.commodityName}>{item.commodity}</Text>
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={11} color="#94A3B8" />
              <Text style={s.locationText}>{item.mandi}, {item.district}</Text>
            </View>
          </View>
          <View style={[s.trendBadge, { backgroundColor: trendBg }]}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
          </View>
        </View>

        {/* Price Row */}
        <View style={s.priceRow}>
          <View style={s.priceCol}>
            <Text style={s.priceLabel}>MIN</Text>
            <Text style={s.priceMin}>₹{item.minPrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[s.priceCol, s.priceColCenter]}>
            <Text style={s.priceLabel}>MODAL</Text>
            <Text style={s.priceModal}>₹{item.modalPrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.priceCol}>
            <Text style={s.priceLabel}>MAX</Text>
            <Text style={s.priceMax}>₹{item.maxPrice.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.cardFooter}>
          <Text style={s.footerChip}>{item.variety}</Text>
          <Text style={s.footerDate}>{item.unit}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={Gradients.mesh as any} style={s.header}>
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => { router.back(); hapticLight(); }}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Mandi Prices</Text>
            {meta && (
              <Text style={s.headerSub}>
                {meta.source === 'fallback' ? 'Offline • ' :
                 meta.source === 'live' ? 'Live • ' : ''}
                Updated {formatTimeAgo(meta.fetchedAt)}
                {meta.filters.state ? ` • ${meta.filters.state}` : ''}
                {` • ${meta.totalMandis} mandis`}
              </Text>
            )}
          </View>
          {meta?.source === 'fallback' && (
            <View style={s.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#F59E0B" />
            </View>
          )}
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search commodity, mandi..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* Commodity Filter */}
      <View style={s.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
          {commoditiesList.map(c => {
            const active = selectedCommodity === c;
            return (
              <TouchableOpacity
                key={c}
                style={[s.chip, active && s.chipActive]}
                onPress={() => { setSelectedCommodity(c); hapticSelection(); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* State sub-filter */}
        {statesList.length > 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {statesList.map(st => {
              const active = selectedState === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.stateChip, active && s.stateChipActive]}
                  onPress={() => { setSelectedState(st); hapticSelection(); }}
                >
                  <Text style={[s.stateChipText, active && s.stateChipTextActive]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Count */}
      <View style={s.countRow}>
        <Text style={s.countText}>
          {filteredPrices.length} price{filteredPrices.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredPrices}
        renderItem={renderPriceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E4A" />}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No prices found</Text>
            <Text style={s.emptySub}>
              {searchQuery ? 'Try a different search term' : 'No mandi price data available for this filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2,
    fontFamily: FontFamily.medium,
  },
  offlineBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)', alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#FFF',
    fontFamily: FontFamily.regular,
  },

  // Filters
  filterSection: { backgroundColor: '#FFF', paddingVertical: 10, gap: 8 },
  filterChips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#FAFAF8', borderWidth: 1.5, borderColor: '#E8E6E1',
  },
  chipActive: { backgroundColor: '#1B5E4A', borderColor: '#1B5E4A' },
  chipText: {
    fontSize: 12, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
  },
  chipTextActive: { color: '#FFF' },
  stateChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E8E6E1',
  },
  stateChipActive: { backgroundColor: 'rgba(27,94,74,0.08)', borderColor: '#1B5E4A30' },
  stateChipText: {
    fontSize: 10, fontWeight: '500', color: '#94A3B8',
    fontFamily: FontFamily.medium,
  },
  stateChipTextActive: { color: '#1B5E4A', fontWeight: '600' },

  // Count
  countRow: { paddingHorizontal: 20, paddingVertical: 8 },
  countText: { fontSize: 11, color: '#94A3B8', fontFamily: FontFamily.medium },

  // List
  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 100 : 32 },

  // Card
  card: {
    backgroundColor: '#FFF', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: '#E8E6E1',
    padding: 16, marginBottom: 10,
    ...Shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  commodityName: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locationText: {
    fontSize: 11, color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },
  trendBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // Price row
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  priceCol: { alignItems: 'center', flex: 1 },
  priceColCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0EDE8' },
  priceLabel: {
    fontSize: 9, color: '#94A3B8', fontWeight: '700',
    fontFamily: FontFamily.bold, letterSpacing: 0.8, marginBottom: 4,
  },
  priceMin: {
    fontSize: 14, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold, fontVariant: ['tabular-nums'] as any,
  },
  priceModal: {
    fontSize: 18, fontWeight: '800', color: '#D9A441',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
  },
  priceMax: {
    fontSize: 14, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold, fontVariant: ['tabular-nums'] as any,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  footerChip: {
    fontSize: 10, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold, backgroundColor: '#FAFAF8',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    overflow: 'hidden',
  },
  footerDate: {
    fontSize: 10, color: '#94A3B8',
    fontFamily: FontFamily.medium,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },
  emptySub: {
    fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40,
    fontFamily: FontFamily.regular,
  },
});
