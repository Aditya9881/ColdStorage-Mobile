import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getCommodityVisual } from '@/lib/commodityImages';

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

const UI = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAF7',
  surfaceMuted: '#F2F5F1',
  border: '#E2E9E3',
  text: '#15231D',
  muted: '#718079',
  subtle: '#96A19B',
  forest: '#103E34',
  forestSoft: '#E8F5EF',
  goldSoft: '#F6F2E7',
};

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
  const insets = useSafeAreaInsets();
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
      const params = new URLSearchParams();
      if (user?.state) params.set('state', user.state);

      const url = `/market-prices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<any>(url);

      if (res.success && res.data) {
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
              modalPrice > midpoint * 1.05
                ? 'up'
                : modalPrice < midpoint * 0.95
                ? 'down'
                : 'stable';

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

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  };

  const filteredPrices = React.useMemo(() => {
    let result = prices;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.commodity.toLowerCase().includes(q) ||
          p.mandi.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q)
      );
    }

    if (selectedState !== 'All') {
      result = result.filter((p) => p.state === selectedState);
    }

    if (selectedCommodity !== 'All') {
      result = result.filter((p) => p.commodity === selectedCommodity);
    }

    return result;
  }, [prices, searchQuery, selectedState, selectedCommodity]);

  const statesList = ['All', ...Array.from(new Set(prices.map((p) => p.state).filter(Boolean)))];
  const commoditiesList = [
    'All',
    ...Array.from(new Set(prices.map((p) => p.commodity).filter(Boolean))),
  ];

  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={UI.canvas} />
        <View style={[s.topSpacer, { height: insets.top + 8 }]} />
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={19} color={UI.text} />
          </TouchableOpacity>
          <Text style={s.screenTitle}>Mandi Prices</Text>
          <View style={s.iconBtnGhost} />
        </View>
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
    const trendColor =
      item.trend === 'up' ? '#059669' : item.trend === 'down' ? '#DC2626' : '#6B7280';

    const trendBg =
      item.trend === 'up' ? '#DCFCE7' : item.trend === 'down' ? '#FEE2E2' : '#F3F4F6';

    const trendIcon =
      item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';

    const visual = getCommodityVisual(item.commodity);

    return (
      <TouchableOpacity activeOpacity={0.9} style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.commodityIconWrap, { backgroundColor: visual.bg }]}>
            <Text style={s.commodityEmoji}>{visual.emoji}</Text>
          </View>

          <View style={s.cardHeaderText}>
            <View style={s.nameRow}>
              <Text style={s.commodityName} numberOfLines={1}>
                {item.commodity}
              </Text>

              <View style={[s.trendBadge, { backgroundColor: trendBg }]}>
                <Ionicons name={trendIcon as any} size={11} color={trendColor} />
              </View>
            </View>

            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={11} color={UI.subtle} />
              <Text style={s.locationText} numberOfLines={1}>
                {item.mandi}, {item.district}
              </Text>
            </View>

            {item.variety && item.variety !== 'Other' ? (
              <Text style={s.varietyText}>{item.variety}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.priceSection}>
          <View style={s.modalBlock}>
            <Text style={s.modalLabel}>Modal Price</Text>
            <Text style={[s.modalValue, { color: visual.accent }]}>
              ₹{item.modalPrice.toLocaleString('en-IN')}
            </Text>
            <Text style={s.modalUnit}>{item.unit}</Text>
          </View>

          <View style={s.minMaxRow}>
            <View style={s.minMaxBox}>
              <Text style={s.minMaxLabel}>MIN</Text>
              <Text style={s.minMaxValue}>₹{item.minPrice.toLocaleString('en-IN')}</Text>
            </View>

            <View style={s.minMaxDivider} />

            <View style={s.minMaxBox}>
              <Text style={s.minMaxLabel}>MAX</Text>
              <Text style={s.minMaxValue}>₹{item.maxPrice.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        <View style={s.cardFooter}>
          <View style={s.statePill}>
            <Text style={s.statePillText}>{item.state}</Text>
          </View>

          <View style={s.footerRight}>
            {!!item.arrivalDate && (
              <Text style={s.footerMetaText}>{item.arrivalDate}</Text>
            )}
            <Text style={s.footerMetaText}>{item.commodity}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={UI.canvas} />

      <View style={[s.topSpacer, { height: insets.top + 8 }]} />

      <View style={s.topBar}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => {
            router.back();
            hapticLight();
          }}
        >
          <Ionicons name="arrow-back" size={19} color={UI.text} />
        </TouchableOpacity>

        <View style={s.titleBlock}>
          <Text style={s.screenTitle}>Mandi Prices</Text>
          {meta ? (
            <Text style={s.screenSub} numberOfLines={1}>
              {meta.source === 'fallback'
                ? 'Offline • '
                : meta.source === 'live'
                ? 'Live • '
                : 'Cached • '}
              Updated {formatTimeAgo(meta.fetchedAt)}
              {meta.filters.state ? ` • ${meta.filters.state}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={s.iconBtnGhost} />
      </View>

      <View style={s.searchSection}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search commodity, mandi, district..."
            placeholderTextColor="#98A2B3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#A0A8B5" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={s.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterChips}
        >
          {commoditiesList.map((c) => {
            const active = selectedCommodity === c;
            return (
              <TouchableOpacity
                key={c}
                style={[s.chip, active && s.chipActive]}
                onPress={() => {
                  setSelectedCommodity(c);
                  hapticSelection();
                }}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {statesList.length > 2 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterChips}
          >
            {statesList.map((st) => {
              const active = selectedState === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.stateChip, active && s.stateChipActive]}
                  onPress={() => {
                    setSelectedState(st);
                    hapticSelection();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.stateChipText, active && s.stateChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={s.countRow}>
        <Text style={s.countText}>
          {filteredPrices.length} price{filteredPrices.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredPrices}
        renderItem={renderPriceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={UI.forest}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="bar-chart-outline" size={28} color="#AAB4AE" />
            </View>
            <Text style={s.emptyTitle}>No prices found</Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? 'Try a different search term'
                : 'No mandi price data available for this filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  topSpacer: {
    height: 24,
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBtnGhost: {
    width: 36,
    height: 36,
  },

  titleBlock: {
    flex: 1,
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.4,
  },

  screenSub: {
    fontSize: 11,
    color: UI.muted,
    marginTop: 4,
  },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },

  searchBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E4E8E4',
    shadowColor: '#173528',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#23323D',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
  },

  filterSection: {
    paddingTop: 12,
    gap: 8,
  },

  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5F6B7A',
  },

  chipTextActive: {
    color: '#FFF',
  },

  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateChipActive: {
    backgroundColor: UI.forestSoft,
    borderColor: '#B8D4C8',
  },

  stateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C8A9F',
  },

  stateChipTextActive: {
    color: UI.forest,
    fontWeight: '800',
  },

  countRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },

  countText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 28,
  },

  card: {
    backgroundColor: UI.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7ECE7',
    marginBottom: 10,
    padding: 14,
    shadowColor: '#173528',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  commodityIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commodityEmoji: {
    fontSize: 24,
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  commodityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.2,
    paddingRight: 6,
  },

  trendBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  locationText: {
    flex: 1,
    fontSize: 10.5,
    color: '#8E98A8',
    fontWeight: '500',
  },

  varietyText: {
    marginTop: 4,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },

  priceSection: {
    marginTop: 12,
  },

  modalBlock: {
    backgroundColor: UI.goldSoft,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  modalLabel: {
    fontSize: 10.5,
    color: '#8E98A8',
    fontWeight: '700',
  },

  modalValue: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.45,
  },

  modalUnit: {
    marginTop: 2,
    fontSize: 10.5,
    color: '#8E98A8',
    fontWeight: '600',
  },

  minMaxRow: {
    marginTop: 10,
    flexDirection: 'row',
    backgroundColor: UI.surfaceMuted,
    borderRadius: 15,
    paddingVertical: 10,
  },

  minMaxBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  minMaxDivider: {
    width: 1,
    backgroundColor: '#DFE5DD',
    marginVertical: 4,
  },

  minMaxLabel: {
    fontSize: 10,
    color: '#8E98A8',
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 3,
  },

  minMaxValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#5F6B7A',
  },

  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  statePill: {
    backgroundColor: '#EEF2EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5F6B7A',
  },

  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },

  footerMetaText: {
    fontSize: 10,
    color: '#8E98A8',
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E8EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: UI.text,
  },

  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});