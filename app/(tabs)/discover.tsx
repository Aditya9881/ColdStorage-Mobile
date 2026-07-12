/**
 * ColdStorage — Premium Discover Screen (Authenticated Farmer View)
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Gradient mesh header with grain texture
 * - State filter pills with active fill + count badges
 * - Rich facility cards with ProgressRing capacity gauge
 * - Verified badge with shimmer
 * - Warm off-white background, refined shadows
 * - Only shows platform-registered & verified facilities
 * - All API calls UNCHANGED
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, Dimensions,
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
import ProgressRing from '@/components/ui/ProgressRing';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const INDIAN_STATES = ['All', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat', 'Maharashtra', 'Punjab', 'Rajasthan', 'Bihar', 'West Bengal'];

export default function DiscoverScreen() {
  const router = useRouter();
  const colors = Colors.light;

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');

  const fetchFacilities = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/facilities?limit=50');
      if (res.success && res.data) {
        const facs = Array.isArray(res.data) ? res.data : (res.data.facilities || []);
        const verified = facs.filter((f: any) => f.status === 'ACTIVE');
        setFacilities(verified);
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFacilities();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = [...facilities];
    if (selectedState !== 'All') {
      result = result.filter(f => f.state === selectedState);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q) ||
        f.state?.toLowerCase().includes(q) ||
        (f.pincode && f.pincode.includes(q))
      );
    }
    return result;
  }, [facilities, selectedState, search]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    facilities.forEach(f => { counts[f.state] = (counts[f.state] || 0) + 1; });
    return counts;
  }, [facilities]);

  if (loading) {
    return (
      <View style={s.screen}>
        <LinearGradient colors={Gradients.mesh as any} style={s.header}>
          <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
          <Text style={s.headerTitle}>Discover Storage</Text>
          <Text style={s.headerSub}>Find verified cold storages</Text>
        </LinearGradient>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.screen}>
        <ErrorState variant="network" onRetry={fetchFacilities} />
      </View>
    );
  }

  const GRADIENT_SETS = [
    ['#059669', '#10B981'],
    ['#0891B2', '#22D3EE'],
    ['#7C3AED', '#A78BFA'],
    ['#D97706', '#FBBF24'],
    ['#DC2626', '#F87171'],
  ];

  const renderFacility = ({ item, index }: { item: any; index: number }) => {
    const totalCap = Number(item.totalCapacityMt || 0);
    const chambers = item.chambers || [];
    const occupiedMt = chambers.reduce((sum: number, c: any) => sum + Number(c.occupiedMt || 0), 0);
    const availableMt = totalCap - occupiedMt;
    const usedPercent = totalCap > 0 ? Math.round((occupiedMt / totalCap) * 100) : 0;
    const rating = Number(item.averageRating || 0);
    const reviewCount = Number(item.reviewCount || 0);
    const isVerified = !!item.verifiedAt;
    const gradColors = GRADIENT_SETS[index % GRADIENT_SETS.length];

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { router.push(`/facility/${item.id}`); hapticLight(); }}
        activeOpacity={0.75}
      >
        {/* Top Row: Icon + Name + Rating */}
        <View style={s.cardTop}>
          <LinearGradient colors={gradColors as any} style={s.cardIcon}>
            <Ionicons name="snow" size={20} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              {isVerified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#059669" />
                </View>
              )}
            </View>
            <View style={s.locationRow}>
              <Ionicons name="location" size={11} color="#94A3B8" />
              <Text style={s.locationText}>{item.city}, {item.state}</Text>
            </View>
          </View>
          {rating > 0 && (
            <View style={s.ratingPill}>
              <Ionicons name="star" size={12} color="#D9A441" />
              <Text style={s.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount > 0 && (
                <Text style={s.reviewCount}>({reviewCount})</Text>
              )}
            </View>
          )}
        </View>

        {/* Capacity Section with ProgressRing */}
        <View style={s.capacitySection}>
          <View style={s.capacityRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.capacityLabel}>STORAGE CAPACITY</Text>
              <View style={s.capacityNums}>
                <Text style={s.capacityAvail}>
                  {availableMt.toLocaleString('en-IN')} MT
                </Text>
                <Text style={s.capacityTotal}> available of {totalCap.toLocaleString('en-IN')} MT</Text>
              </View>
              {/* Gradient progress bar */}
              <View style={s.capacityBar}>
                <LinearGradient
                  colors={usedPercent > 85 ? ['#EF4444', '#F87171'] : usedPercent > 60 ? ['#F59E0B', '#FBBF24'] : ['#10B981', '#34D399']}
                  style={[s.capacityFill, { width: `${Math.min(usedPercent, 100)}%` as any }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
            <ProgressRing percent={usedPercent} size={52} strokeWidth={4} label={`${usedPercent}%`} sublabel="used" />
          </View>
        </View>

        {/* Tags Row */}
        <View style={s.tagsRow}>
          {item.storageType && (
            <View style={s.tag}>
              <Ionicons name="cube-outline" size={10} color="#5F6B7A" />
              <Text style={s.tagText}>{item.storageType}</Text>
            </View>
          )}
          <View style={s.tag}>
            <Ionicons name="thermometer-outline" size={10} color="#5F6B7A" />
            <Text style={s.tagText}>
              {item.chambers && item.chambers.length > 0 && item.chambers[0].targetTempMin
                ? `${Number(item.chambers[0].targetTempMin)}–${Number(item.chambers[0].targetTempMax)}°C`
                : 'Cold Storage'}
            </Text>
          </View>
          {chambers.length > 0 && (
            <View style={s.tag}>
              <Ionicons name="grid-outline" size={10} color="#5F6B7A" />
              <Text style={s.tagText}>{chambers.length} Chambers</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => {
              hapticLight();
              router.push({ pathname: '/book-storage', params: { facilityId: item.id, facilityName: item.name } } as any);
            }}
          >
            <LinearGradient colors={Gradients.mesh as any} style={s.bookGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="calendar-outline" size={15} color="#FFF" />
              <Text style={s.bookText}>Book Storage</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.detailBtn}
            onPress={() => { router.push(`/facility/${item.id}`); hapticLight(); }}
          >
            <Ionicons name="information-circle-outline" size={15} color="#1B5E4A" />
            <Text style={s.detailText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#1B5E4A" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.screen}>
      {/* ── Premium Header ── */}
      <LinearGradient colors={Gradients.mesh as any} style={s.header}>
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Discover Storage</Text>
            <Text style={s.headerSub}>
              {facilities.length} verified facilities
            </Text>
          </View>
          <View style={s.platformBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#34D399" />
            <Text style={s.platformBadgeText}>Verified</Text>
          </View>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search facility, city, state or pincode..." />
      </LinearGradient>

      {/* State Filter Chips */}
      <FlatList
        data={INDIAN_STATES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={s.filterChips}
        style={s.filterRow}
        renderItem={({ item }) => {
          const active = selectedState === item;
          const count = item === 'All' ? facilities.length : (stateCounts[item] || 0);
          return (
            <TouchableOpacity
              style={[s.chip, active && s.chipActive]}
              onPress={() => { setSelectedState(item); hapticSelection(); }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{item}</Text>
              {count > 0 && (
                <View style={[s.chipBadge, active && s.chipBadgeActive]}>
                  <Text style={[s.chipBadgeText, active && { color: '#1B5E4A' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Results Bar */}
      <View style={s.resultsBar}>
        <Text style={s.resultsText}>
          {filtered.length} facilit{filtered.length === 1 ? 'y' : 'ies'} found
        </Text>
        <View style={s.sortPill}>
          <Ionicons name="funnel-outline" size={12} color="#5F6B7A" />
          <Text style={s.sortText}>Nearest</Text>
        </View>
      </View>

      {/* Facilities List */}
      <FlatList
        data={filtered}
        renderItem={renderFacility}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E4A" />}
        ListEmptyComponent={
          <EmptyState
            icon="compass-outline"
            title={search ? 'No Results' : 'No Facilities'}
            subtitle={search ? 'Try a different search or filter' : 'No verified cold storage facilities found.'}
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F2' },

  // ── Header ──
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4,
    fontFamily: FontFamily.regular,
  },
  platformBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
  },
  platformBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#6EE7B7',
    fontFamily: FontFamily.bold,
  },

  // ── Filters ──
  filterRow: {
    backgroundColor: '#FFFFFF', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8E6E1',
    flexGrow: 0,
  },
  filterChips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#FAFAF8', borderWidth: 1.5, borderColor: '#E8E6E1',
  },
  chipActive: { backgroundColor: '#1B5E4A', borderColor: '#1B5E4A' },
  chipText: {
    fontSize: 12, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
  },
  chipTextActive: { color: '#FFF' },
  chipBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8E6E1', paddingHorizontal: 4,
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#5F6B7A',
    fontFamily: FontFamily.bold,
  },

  // ── Results ──
  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  resultsText: {
    fontSize: 12, color: '#94A3B8', fontWeight: '500',
    fontFamily: FontFamily.medium,
  },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E8E6E1',
  },
  sortText: {
    fontSize: 11, color: '#5F6B7A', fontWeight: '600',
    fontFamily: FontFamily.semibold,
  },

  list: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 100 : 32 },

  // ── Facility Card ──
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold, flex: 1,
  },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText: {
    fontSize: 12, color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FBF5E8', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1, borderColor: '#E8BE6A30',
  },
  ratingValue: {
    fontSize: 13, fontWeight: '800', color: '#D9A441',
    fontFamily: FontFamily.extrabold,
  },
  reviewCount: {
    fontSize: 10, color: '#94A3B8', fontFamily: FontFamily.regular,
  },

  // ── Capacity ──
  capacitySection: { marginTop: 16 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  capacityLabel: {
    fontSize: 9, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 4,
    fontFamily: FontFamily.bold,
  },
  capacityNums: { flexDirection: 'row', alignItems: 'baseline' },
  capacityAvail: {
    fontSize: 16, fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    color: '#1A1A2E',
  },
  capacityTotal: {
    fontSize: 11, color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },
  capacityBar: {
    height: 5, borderRadius: 3, backgroundColor: '#F0EDE8',
    marginTop: 8, overflow: 'hidden',
  },
  capacityFill: { height: '100%' as any, borderRadius: 3 },

  // ── Tags ──
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E8E6E1',
  },
  tagText: {
    fontSize: 11, color: '#5F6B7A', fontWeight: '500',
    fontFamily: FontFamily.medium,
  },

  // ── Actions ──
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  bookBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', ...Shadows.glow },
  bookGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
  },
  bookText: {
    fontSize: 13, fontWeight: '700', color: '#FFF',
    fontFamily: FontFamily.bold,
  },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#1B5E4A',
    backgroundColor: 'rgba(27, 94, 74, 0.04)',
  },
  detailText: {
    fontSize: 13, fontWeight: '600', color: '#1B5E4A',
    fontFamily: FontFamily.semibold,
  },
});
