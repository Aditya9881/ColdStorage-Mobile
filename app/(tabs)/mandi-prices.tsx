/**
 * ColdStorage — Mandi Prices Tab
 *
 * Premium mobile version matching Bookings/Profile design language:
 * - White header with SheetKosh branding + gold avatar
 * - Hero badge + big title + location indicator
 * - Premium search bar and filter chips
 * - Clean white price cards with trend badges
 * - Location-based nearby mandi prices
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getCommodityVisual } from '@/lib/commodityImages';

/* ─── Interfaces ─── */
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
}

/* ─── Filter Chips ─── */
const COMMODITY_FILTERS = [
  { key: '', label: 'All' },
  { key: 'Potato', label: 'Potato' },
  { key: 'Onion', label: 'Onion' },
  { key: 'Tomato', label: 'Tomato' },
  { key: 'Apple', label: 'Apple' },
  { key: 'Rice', label: 'Rice' },
  { key: 'Wheat', label: 'Wheat' },
  { key: 'Soybean', label: 'Soyabean' },
  { key: 'Maize', label: 'Maize' },
];

/* ─── Trend Badge Colors ─── */
const TREND_STYLES: Record<string, { bg: string; text: string; icon: string; soft: string }> = {
  up: { bg: '#CAECDC', text: '#0A8660', icon: 'trending-up', soft: '#F1FBF6' },
  down: { bg: '#FDE0E0', text: '#D03030', icon: 'trending-down', soft: '#FEF3F3' },
  stable: { bg: '#E8ECF0', text: '#5F6B7A', icon: 'remove', soft: '#F5F7F9' },
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

/* ═══════════════════════════════════════════ */
/*             MAIN COMPONENT                  */
/* ═══════════════════════════════════════════ */
export default function MandiPricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [meta, setMeta] = useState<PricesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  // ── Location Detection ──
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [addr] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (addr) {
            setDetectedState(addr.region || null);
            setDetectedCity(addr.city || addr.subregion || null);
          }
        }
      } catch {
        // GPS unavailable — fallback to profile
      }
    })();
  }, []);

  const userState = detectedState || user?.state || null;
  const locationLabel = detectedCity
    ? `${detectedCity}, ${userState || ''}`
    : userState || 'All India';

  // ── Fetch Prices ──
  const fetchPrices = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      if (userState) params.set('state', userState);
      const url = `/market-prices${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<any>(url);

      if (res.success && res.data) {
        const mapped: MandiPrice[] = [];
        let idx = 0;
        for (const group of res.data) {
          for (const m of (group.mandis || [])) {
            idx++;
            mapped.push({
              id: `${idx}-${group.commodity || ''}-${m.mandi || ''}-${m.variety || ''}`,
              commodity: group.commodity || 'Unknown',
              state: m.state || '',
              district: m.district || '',
              mandi: m.mandi || '',
              variety: m.variety || '-',
              minPrice: m.minPrice || 0,
              maxPrice: m.maxPrice || 0,
              modalPrice: m.modalPrice || 0,
              unit: m.unit || 'Qtl',
              arrivalDate: m.arrivalDate || new Date().toISOString(),
              trend: m.trend || 'stable',
            });
          }
        }
        setPrices(mapped);
        setMeta((res as any).meta || null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userState]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    hapticLight();
    fetchPrices();
  }, [fetchPrices]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prices.filter((p) => {
      if (commodityFilter && p.commodity.toLowerCase() !== commodityFilter.toLowerCase()) return false;
      if (q) {
        return (
          p.commodity.toLowerCase().includes(q) ||
          p.mandi.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.variety.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [prices, search, commodityFilter]);

  /* ─── Price Card ─── */
  const renderPrice = ({ item, index }: { item: MandiPrice; index: number }) => {
    const visual = getCommodityVisual(item.commodity);
    const tc = TREND_STYLES[item.trend] || TREND_STYLES.stable;
    const iconColors = ['#167B67', '#6666D8', '#C87A2E', '#2E7DC8'];
    const iconBgs = ['#E6F3EE', '#EEF0FD', '#FFF3E6', '#E6F0FA'];

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={s.cardLeft}>
            <View style={[s.cardIcon, { backgroundColor: iconBgs[index % 4] }]}>
              {visual.imageUrl ? (
                <Image
                  source={{ uri: visual.imageUrl }}
                  style={s.cardIconImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="leaf" size={18} color={iconColors[index % 4]} />
              )}
            </View>
            <View style={s.cardMain}>
              <Text style={s.cardCommodity} numberOfLines={1}>
                {item.commodity}
              </Text>
              <Text style={s.cardMandi} numberOfLines={1}>
                {item.mandi}{item.district ? `, ${item.district}` : ''}
              </Text>
            </View>
          </View>

          <View style={[s.trendChip, { backgroundColor: tc.soft, borderColor: tc.bg }]}>
            <Ionicons name={tc.icon as any} size={12} color={tc.text} />
            <Text style={[s.trendChipText, { color: tc.text }]} numberOfLines={1}>
              {item.trend === 'up' ? 'UP' : item.trend === 'down' ? 'DOWN' : 'STABLE'}
            </Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={s.infoRow}>
          {item.variety && item.variety !== '-' && (
            <View style={s.infoPill}>
              <Ionicons name="leaf-outline" size={13} color="#7B8693" />
              <Text style={s.infoPillText} numberOfLines={1}>{item.variety}</Text>
            </View>
          )}
          <View style={s.infoPill}>
            <Ionicons name="scale-outline" size={13} color="#7B8693" />
            <Text style={s.infoPillText}>per {item.unit || 'Qtl'}</Text>
          </View>
        </View>

        {/* Price Row */}
        <View style={s.priceRow}>
          <View style={s.priceMain}>
            <Text style={s.priceLabel}>Modal</Text>
            <Text style={s.priceValue}>₹{item.modalPrice?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.priceRange}>
            <Text style={s.priceRangeLabel}>Range</Text>
            <Text style={s.priceRangeValue}>
              ₹{item.minPrice?.toLocaleString('en-IN')} — ₹{item.maxPrice?.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ─── List Header (Premium — matches Bookings) ─── */
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
            <Text style={s.brandSub}>Market prices</Text>
          </View>

          <TouchableOpacity style={s.avatarRing} activeOpacity={0.86} onPress={hapticLight}>
            <Image
              source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/120?img=12' }}
              style={s.avatar}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.heroSection}>
        <View style={s.heroBadge}>
          <View style={s.heroBadgeDot} />
          <Text style={s.heroBadgeText}>
            {meta?.source === 'live' ? 'Live prices' : meta?.source === 'cached' ? 'Cached prices' : 'Market data'}
            {meta?.fetchedAt ? ` · ${formatTimeAgo(meta.fetchedAt)}` : ''}
          </Text>
        </View>

        <Text style={s.pageTitle}>Mandi Prices</Text>

        <View style={s.locationRow}>
          <Ionicons name="location" size={14} color="#86908B" />
          <Text style={s.locationText}>{locationLabel}</Text>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <View style={s.searchIconWrap}>
              <Ionicons name="search-outline" size={20} color="#7E848D" />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search commodity, mandi, district..."
              placeholderTextColor="#8E949C"
              style={s.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.82}>
                <Ionicons name="close-circle" size={18} color="#A1A7AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Commodity Filter Chips */}
        <FlatList
          data={COMMODITY_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.key || 'all'}
          contentContainerStyle={s.filterContent}
          renderItem={({ item: f }) => {
            const active = commodityFilter === f.key;
            return (
              <TouchableOpacity
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => {
                  setCommodityFilter(f.key);
                  hapticSelection();
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
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <View style={{ flex: 1 }}>
          <ListHeader />
          <View style={s.emptyWrap}>
            <ActivityIndicator size="small" color="#0A4E40" />
            <Text style={s.emptySubtitle}>Fetching latest prices...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={{ flex: 1 }}>
          <ListHeader />
          <View style={s.emptyWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color="#A0A8B4" />
            <Text style={s.emptyTitle}>Failed to load prices</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchPrices} activeOpacity={0.85}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderPrice}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A4E40" />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="leaf-outline" size={36} color="#A0A8B4" />
              <Text style={s.emptyTitle}>No prices found</Text>
              <Text style={s.emptySubtitle}>Try a different commodity or search term</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ height: 120 }}>
              {meta && (
                <Text style={s.footerText}>
                  {filtered.length} results · {meta.totalCommodities || 0} commodities · {meta.totalMandis || 0} mandis
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════ */
/*               STYLES                        */
/* ═══════════════════════════════════════════ */
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F2',
  },

  /* ── Top Bar (matches Bookings) ── */
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

  /* ── Hero Section ── */
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#86908B',
    fontWeight: '600',
  },

  /* ── Search (matches Bookings) ── */
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2A24',
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },

  /* ── Filter Chips (matches Bookings) ── */
  filterContent: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E5DD',
  },
  filterChipActive: {
    backgroundColor: '#0A4E40',
    borderColor: '#0A4E40',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5D6962',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* ── List ── */
  listContent: {
    paddingBottom: 100,
  },

  /* ── Card (matches Bookings card style) ── */
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8ECE5',
    shadowColor: '#203128',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardIconImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  cardMain: {
    flex: 1,
  },
  cardCommodity: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.3,
  },
  cardMandi: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7B8693',
    marginTop: 2,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    marginLeft: 8,
  },
  trendChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ── Info Row ── */
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F4F6F3',
    borderRadius: 10,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D6962',
  },

  /* ── Price Row ── */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2EE',
  },
  priceMain: {
    gap: 2,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86908B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0A4E40',
    letterSpacing: -0.5,
  },
  priceRange: {
    alignItems: 'flex-end',
    gap: 2,
  },
  priceRangeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86908B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  priceRangeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D6962',
  },

  /* ── Empty / Error States ── */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B2520',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#86908B',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#0A4E40',
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#A0A8B4',
    marginTop: 16,
  },
});
