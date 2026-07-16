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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  FontFamily,
} from '@/constants/Colors';
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
        <LinearGradient colors={['#0F3D33', '#166534', '#1B5E4A']} style={s.header}>
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
    const trendColor =
      item.trend === 'up' ? '#059669' : item.trend === 'down' ? '#DC2626' : '#6B7280';
    const trendBg =
      item.trend === 'up' ? '#DCFCE7' : item.trend === 'down' ? '#FEE2E2' : '#F3F4F6';
    const trendIcon =
      item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';
    const visual = getCommodityVisual(item.commodity);

    return (
      <View style={s.card}>
        {/* Top row with emoji + info */}
        <View style={s.cardTop}>
          <View style={[s.commodityEmojiWrap, { backgroundColor: visual.bg }]}>
            <Text style={s.commodityEmoji}>{visual.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.titleRow}>
              <Text style={s.commodityName}>{item.commodity}</Text>
              <View style={[s.trendBadge, { backgroundColor: trendBg }]}>
                <Ionicons name={trendIcon as any} size={12} color={trendColor} />
              </View>
            </View>

            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={11} color="#94A3B8" />
              <Text style={s.locationText}>
                {item.mandi}, {item.district}
              </Text>
            </View>

            {item.variety && item.variety !== 'Other' && (
              <View style={s.varietyRow}>
                <Text style={s.varietyText}>{item.variety}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.heroPricePanel}>
          <Text style={s.heroPriceLabel}>Modal Price</Text>
          <Text style={[s.heroPriceValue, { color: visual.accent }]}>₹{item.modalPrice.toLocaleString('en-IN')}</Text>
          <Text style={s.heroPriceUnit}>{item.unit}</Text>
        </View>

        <View style={s.rangePanel}>
          <View style={s.rangeCol}>
            <Text style={s.rangeLabel}>MIN</Text>
            <Text style={s.rangeValueMuted}>₹{item.minPrice.toLocaleString('en-IN')}</Text>
          </View>

          <View style={s.rangeDivider} />

          <View style={s.rangeCol}>
            <Text style={s.rangeLabel}>MAX</Text>
            <Text style={s.rangeValueMuted}>₹{item.maxPrice.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={s.footerRow}>
          <View style={s.footerChip}>
            <Text style={s.footerChipText}>{item.commodity}</Text>
          </View>

          <View style={s.footerMetaGroup}>
            {!!item.arrivalDate && (
              <Text style={s.footerMetaText}>{item.arrivalDate}</Text>
            )}
            <Text style={s.footerMetaText}>{item.state}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#0F3D33', '#166534', '#1B5E4A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />

        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              router.back();
              hapticLight();
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Mandi Prices</Text>
            {meta && (
              <Text style={s.headerSub}>
                {meta.source === 'fallback'
                  ? 'Offline • '
                  : meta.source === 'live'
                  ? 'Live • '
                  : 'Cached • '}
                Updated {formatTimeAgo(meta.fetchedAt)}
                {meta.filters.state ? ` • ${meta.filters.state}` : ''}
              </Text>
            )}
          </View>

          {meta?.source === 'fallback' && (
            <View style={s.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#F59E0B" />
            </View>
          )}
        </View>

        <View style={s.summaryStrip}>
          <View style={s.summaryPill}>
            <Text style={s.summaryValue}>{meta?.totalMandis || 0}</Text>
            <Text style={s.summaryLabel}>Mandis</Text>
          </View>
          <View style={s.summaryPill}>
            <Text style={s.summaryValue}>{meta?.totalCommodities || 0}</Text>
            <Text style={s.summaryLabel}>Commodities</Text>
          </View>
          <View style={s.summaryPill}>
            <Text style={s.summaryValue}>{filteredPrices.length}</Text>
            <Text style={s.summaryLabel}>Visible</Text>
          </View>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={s.searchInput}
            placeholder="Search commodity, mandi..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

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
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {statesList.length > 2 && (
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
                >
                  <Text style={[s.stateChipText, active && s.stateChipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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
            tintColor="#1B5E4A"
          />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
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
    backgroundColor: '#F4F6F1',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },

  grainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
    fontFamily: FontFamily.medium,
  },

  offlineBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  summaryPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FontFamily.extrabold,
  },

  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
    fontFamily: FontFamily.medium,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
    fontFamily: FontFamily.regular,
  },

  filterSection: {
    backgroundColor: '#F4F6F1',
    paddingTop: 12,
    gap: 8,
  },

  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
  },

  chipActive: {
    backgroundColor: '#1B5E4A',
    borderColor: '#1B5E4A',
  },

  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
  },

  chipTextActive: {
    color: '#FFF',
  },

  stateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EEF2EA',
    borderWidth: 1,
    borderColor: '#DDE5DA',
  },

  stateChipActive: {
    backgroundColor: '#E2F0EA',
    borderColor: '#B8D4C8',
  },

  stateChipText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7C8A9F',
    fontFamily: FontFamily.medium,
  },

  stateChipTextActive: {
    color: '#1B5E4A',
    fontWeight: '700',
  },

  countRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  countText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontFamily: FontFamily.medium,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 32,
  },

  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9E6DE',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#1B332A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  cardTop: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFDF9',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  commodityEmojiWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commodityEmoji: {
    fontSize: 26,
  },

  varietyRow: {
    marginTop: 4,
  },

  varietyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  commodityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  locationText: {
    fontSize: 11,
    color: '#8E98A8',
    fontFamily: FontFamily.regular,
  },

  trendBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroPricePanel: {
    marginHorizontal: 16,
    backgroundColor: '#F6F2E7',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  heroPriceLabel: {
    fontSize: 11,
    color: '#8E98A8',
    fontFamily: FontFamily.medium,
  },

  heroPriceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#C68A18',
    marginTop: 2,
    fontFamily: FontFamily.extrabold,
    fontVariant: ['tabular-nums'] as any,
  },

  heroPriceUnit: {
    fontSize: 11,
    color: '#8E98A8',
    marginTop: 2,
    fontFamily: FontFamily.medium,
  },

  rangePanel: {
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#F3F5F2',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
  },

  rangeCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rangeDivider: {
    width: 1,
    backgroundColor: '#DFE5DD',
    marginVertical: 4,
  },

  rangeLabel: {
    fontSize: 10,
    color: '#8E98A8',
    fontFamily: FontFamily.bold,
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  rangeValueMuted: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
    fontVariant: ['tabular-nums'] as any,
  },

  footerRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FCFAF4',
  },

  footerChip: {
    backgroundColor: '#EEF2EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  footerChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
  },

  footerMetaGroup: {
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
    fontFamily: FontFamily.medium,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },

  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
    fontFamily: FontFamily.regular,
  },
});