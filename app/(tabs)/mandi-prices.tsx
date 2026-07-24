/**
 * Mandi Prices Tab
 *
 * Wraps the standalone Market Prices screen as a tab.
 * The tab layout sets headerShown: false, and the screen
 * manages its own premium header internally.
 */
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getCommodityVisual, getCommodityCategory } from '@/lib/commodityImages';

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
  border: '#E2E9E3',
  ink: '#15231D',
  muted: '#718079',
  subtle: '#96A19B',
  forest: '#103E34',
  forestMid: '#1A5D4F',
  gold: '#C88C20',
  goldSoft: '#F6F2E7',
  emerald: '#059669',
  emeraldSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
};

const COMMODITIES = ['All', 'Potato', 'Onion', 'Tomato', 'Rice', 'Wheat', 'Soybean', 'Chana', 'Maize'];

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Price Card ─── */
function PriceCard({ item }: { item: MandiPrice }) {
  const visual = getCommodityVisual(item.commodity);
  const [imgError, setImgError] = useState(false);
  const trendColor = item.trend === 'up' ? UI.emerald : item.trend === 'down' ? UI.danger : '#6B7280';
  const trendBg = item.trend === 'up' ? UI.emeraldSoft : item.trend === 'down' ? UI.dangerSoft : '#F3F4F6';
  const trendIcon = item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove';

  return (
    <View style={s.card}>
      <View style={[s.cardImageWrap, { backgroundColor: visual.bg }]}>
        {!imgError ? (
          <Image
            source={{ uri: visual.imageUrl }}
            style={s.cardImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Ionicons name="leaf" size={28} color={visual.accent || UI.forest} />
        )}
      </View>
      <View style={s.cardBody}>
        <View style={s.cardTopRow}>
          <Text style={s.cardCommodity} numberOfLines={1}>{item.commodity}</Text>
          <View style={[s.trendPill, { backgroundColor: trendBg }]}>
            <Ionicons name={trendIcon as any} size={12} color={trendColor} />
            <Text style={[s.trendText, { color: trendColor }]}>
              {item.trend === 'up' ? 'Up' : item.trend === 'down' ? 'Down' : 'Stable'}
            </Text>
          </View>
        </View>
        <Text style={s.cardMandi} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} color={UI.muted} /> {item.mandi}, {item.district}
        </Text>
        {item.variety && item.variety !== '-' && (
          <Text style={s.cardVariety} numberOfLines={1}>{item.variety}</Text>
        )}
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>Modal</Text>
          <Text style={s.priceValue}>₹{item.modalPrice?.toLocaleString('en-IN')}</Text>
          <Text style={s.priceUnit}>/{item.unit || 'Qtl'}</Text>
        </View>
        <View style={s.priceRange}>
          <Text style={s.priceRangeText}>
            ₹{item.minPrice?.toLocaleString('en-IN')} — ₹{item.maxPrice?.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function MandiPricesTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [meta, setMeta] = useState<PricesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('All');
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  // Detect user's location for nearby filtering
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
        // Location not available — use user's profile state
      }
    })();
  }, []);

  const userState = detectedState || user?.state || null;

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
          const mandis = group.mandis || [];
          for (const m of mandis) {
            idx++;
            mapped.push({
              id: `${idx}-${group.commodity || 'unk'}-${m.mandi || 'unk'}-${m.district || 'unk'}`,
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

  const filtered = prices.filter((p) => {
    if (selectedCommodity !== 'All' && p.commodity.toLowerCase() !== selectedCommodity.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.commodity.toLowerCase().includes(q) || p.mandi.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero Header ── */}
      <LinearGradient
        colors={['#0A3A2A', '#135647', '#1A6B58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerEyebrow}>LIVE MARKET DATA</Text>
            <Text style={s.headerTitle}>Mandi Prices</Text>
            {(detectedCity || userState) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                  {detectedCity ? `${detectedCity}, ` : ''}{userState || ''}
                </Text>
              </View>
            )}
          </View>
          {meta?.fetchedAt && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>{formatTimeAgo(meta.fetchedAt)}</Text>
            </View>
          )}
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search commodity, mandi..."
            placeholderTextColor={UI.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={UI.muted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Commodity Filters ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterBar}
        contentContainerStyle={s.filterContent}
      >
        {COMMODITIES.map((c) => {
          const isActive = selectedCommodity === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.filterPill, isActive && s.filterPillActive]}
              onPress={() => { hapticSelection(); setSelectedCommodity(c); }}
              activeOpacity={0.8}
            >
              <Text style={[s.filterPillText, isActive && s.filterPillTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Price List ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <View style={s.loadingDot} />
          <Text style={s.loadingText}>Fetching latest prices...</Text>
        </View>
      ) : error ? (
        <View style={s.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color={UI.subtle} />
          <Text style={s.emptyTitle}>Failed to load prices</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchPrices}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PriceCard item={item} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI.forest} />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="leaf-outline" size={40} color={UI.subtle} />
              <Text style={s.emptyTitle}>No prices found</Text>
              <Text style={s.emptySubtitle}>Try a different commodity or search</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ height: 120 }}>
              {meta && (
                <Text style={s.footerText}>
                  {filtered.length} results • Source: {meta.source === 'live' ? 'Live API' : meta.source === 'cached' ? 'Cached' : 'Fallback'}
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: UI.ink,
  },
  filterBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.surface,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: UI.border,
  },
  filterPillActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.muted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* Card */
  card: {
    flexDirection: 'row',
    backgroundColor: UI.surface,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: 'hidden',
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageWrap: {
    width: 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: 80,
    height: 100,
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCommodity: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.ink,
    flex: 1,
    letterSpacing: -0.3,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMandi: {
    fontSize: 12,
    color: UI.muted,
    fontWeight: '500',
  },
  cardVariety: {
    fontSize: 11,
    color: UI.subtle,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.muted,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.forest,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: UI.subtle,
  },
  priceRange: {
    marginTop: 2,
  },
  priceRangeText: {
    fontSize: 11,
    fontWeight: '500',
    color: UI.subtle,
  },

  /* States */
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: UI.forest,
    opacity: 0.3,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: UI.muted,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: UI.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: UI.muted,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: UI.forest,
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
    color: UI.subtle,
    marginTop: 16,
  },
});
