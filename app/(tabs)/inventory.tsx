/**
 * ColdStorage — Premium Pocket Ledger (Inventory) Screen
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Gradient mesh header with grain texture
 * - Glassmorphic summary strip (lots, weight, rent in gold)
 * - Refined filter chips + sort pills
 * - Premium lot cards with commodity icon, weight bar, gold rent
 * - Warm off-white background
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

const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline', ONION: 'ellipse-outline', VEGETABLES: 'leaf-outline',
  FRUITS: 'nutrition', GRAINS: 'sunny-outline', DAIRY: 'water-outline',
  SPICES: 'flame-outline', OTHER: 'cube-outline',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  STORED: { label: 'Stored', color: '#065F46', bg: '#D1FAE5', border: '#A7F3D0', icon: 'checkmark-circle' },
  PARTIALLY_RELEASED: { label: 'Partial', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', icon: 'pie-chart' },
  FULLY_RELEASED: { label: 'Released', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB', icon: 'exit-outline' },
  INTAKE_PENDING: { label: 'Pending', color: '#155E75', bg: '#CFFAFE', border: '#A5F3FC', icon: 'time-outline' },
  EXPIRED: { label: 'Expired', color: '#991B1B', bg: '#FECACA', border: '#FCA5A5', icon: 'alert-circle' },
};

const FILTERS = [
  { key: 'All', label: 'All', status: '' },
  { key: 'Stored', label: 'Stored', status: 'STORED' },
  { key: 'Partial', label: 'Partial', status: 'PARTIALLY_RELEASED' },
  { key: 'Pending', label: 'Pending', status: 'INTAKE_PENDING' },
  { key: 'Released', label: 'Released', status: 'FULLY_RELEASED' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'weight', label: 'Heaviest', icon: 'scale-outline' },
  { key: 'rent', label: 'Most Rent', icon: 'wallet-outline' },
];

export default function InventoryScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');

  const fetchLots = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/inventory/my-lots?limit=100');
      if (res.success && res.data?.lots) {
        setLots(res.data.lots);
      }
    } catch (err) {
      console.error('Fetch lots error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLots(); }, [fetchLots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLots();
    setRefreshing(false);
  };

  const filteredLots = useMemo(() => {
    let result = [...lots];
    const filterConfig = FILTERS.find(f => f.key === activeFilter);
    if (filterConfig?.status) {
      result = result.filter(l => l.status === filterConfig.status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.lotNumber?.toLowerCase().includes(q) ||
        l.commodityName?.toLowerCase().includes(q) ||
        l.facility?.name?.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'weight') {
      result.sort((a, b) => Number(b.currentWeightKg) - Number(a.currentWeightKg));
    } else if (sortBy === 'rent') {
      result.sort((a, b) => (b.estimatedRent || 0) - (a.estimatedRent || 0));
    } else {
      result.sort((a, b) => new Date(b.intakeDate || 0).getTime() - new Date(a.intakeDate || 0).getTime());
    }
    return result;
  }, [lots, activeFilter, search, sortBy]);

  const summary = useMemo(() => {
    const active = lots.filter(l => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED');
    return {
      count: active.length,
      weight: active.reduce((s, l) => s + Number(l.currentWeightKg || 0), 0),
      rent: active.reduce((s, l) => s + (l.estimatedRent || 0), 0),
    };
  }, [lots]);

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={Gradients.mesh as any} style={s.headerGrad}>
          <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
          <Text style={s.headerTitle}>Pocket Ledger</Text>
        </LinearGradient>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.container}>
        <ErrorState variant="network" onRetry={fetchLots} />
      </View>
    );
  }

  const renderLot = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.STORED;
    const weight = Number(item.currentWeightKg || 0);
    const intakeWeight = Number(item.intakeWeightKg || weight);
    const weightPercent = intakeWeight > 0 ? Math.min(100, (weight / intakeWeight) * 100) : 100;
    const days = item.daysSinceIntake || 0;
    const commodityIcon = COMMODITY_ICON[item.commodityCategory] || 'cube-outline';

    return (
      <TouchableOpacity
        style={s.lotCard}
        onPress={() => { router.push(`/lots/${item.id}`); hapticLight(); }}
        activeOpacity={0.7}
      >
        <View style={s.lotHeader}>
          <View style={[s.commodityIcon, { backgroundColor: `${status.color}10` }]}>
            <Ionicons name={commodityIcon as any} size={22} color={status.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.lotCommodity}>{item.commodityName}</Text>
            <Text style={s.lotNumber}>{item.lotNumber}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
            <Ionicons name={status.icon as any} size={10} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Weight bar */}
        <View style={s.weightSection}>
          <View style={s.weightLabels}>
            <Text style={s.weightValue}>{(weight / 1000).toFixed(2)} MT</Text>
            <Text style={s.weightOf}>of {(intakeWeight / 1000).toFixed(2)} MT</Text>
          </View>
          <View style={s.weightBar}>
            <LinearGradient
              colors={
                weightPercent < 50 ? ['#EF4444', '#F87171'] :
                weightPercent < 80 ? ['#F59E0B', '#FBBF24'] :
                ['#10B981', '#34D399']
              }
              style={[s.weightFill, { width: `${weightPercent}%` as any }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={s.lotFooter}>
          <View style={s.footerItem}>
            <Ionicons name="business-outline" size={11} color="#94A3B8" />
            <Text style={s.footerText} numberOfLines={1}>{item.facility?.name || '—'}</Text>
          </View>
          <View style={s.footerDot} />
          <View style={s.footerItem}>
            <Ionicons name="time-outline" size={11} color="#94A3B8" />
            <Text style={s.footerText}>{days}d</Text>
          </View>
          <View style={s.footerDot} />
          <View style={s.footerItem}>
            <Ionicons name="wallet-outline" size={11} color="#D9A441" />
            <Text style={s.footerRent}>₹{(item.estimatedRent || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <LinearGradient colors={Gradients.mesh as any} style={s.headerGrad}>
        <View style={s.grainOverlay} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
        <Text style={s.headerTitle}>Pocket Ledger</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search lots, commodity..." />

        {/* Summary Strip */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{summary.count}</Text>
            <Text style={s.summaryLabel}>ACTIVE</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{(summary.weight / 1000).toFixed(1)} MT</Text>
            <Text style={s.summaryLabel}>STORED</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValueGold}>₹{summary.rent.toLocaleString('en-IN')}</Text>
            <Text style={s.summaryLabel}>RENT</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Filters + Sort ── */}
      <View style={s.filtersSection}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.filterChips}
          renderItem={({ item }) => {
            const active = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                onPress={() => { setActiveFilter(item.key); hapticSelection(); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
        <View style={s.sortRow}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortBtn, sortBy === opt.key && s.sortBtnActive]}
              onPress={() => { setSortBy(opt.key); hapticSelection(); }}
            >
              <Ionicons
                name={opt.icon as any}
                size={11}
                color={sortBy === opt.key ? '#1B5E4A' : '#94A3B8'}
              />
              <Text style={[s.sortText, sortBy === opt.key && s.sortTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Lots ── */}
      <FlatList
        data={filteredLots}
        renderItem={renderLot}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E4A" />}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={search ? 'No results' : 'No Lots Yet'}
            subtitle={search ? 'Try a different search term' : 'Your inventory lots will appear here once you store produce at a facility.'}
            action={search ? undefined : { label: 'Find Storage', onPress: () => router.push('/(tabs)/discover') }}
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },

  // ── Header ──
  headerGrad: { paddingHorizontal: 20, paddingBottom: 16 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, marginBottom: 12, letterSpacing: -0.3,
  },

  // ── Summary ──
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 14, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: {
    fontSize: 16, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
  },
  summaryValueGold: {
    fontSize: 16, fontWeight: '800', color: '#E8BE6A',
    fontFamily: FontFamily.extrabold, fontVariant: ['tabular-nums'] as any,
  },
  summaryLabel: {
    fontSize: 9, color: 'rgba(255,255,255,0.45)',
    fontFamily: FontFamily.bold, letterSpacing: 0.8,
  },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },

  // ── Filters ──
  filtersSection: { paddingTop: 12 },
  filterChips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8E6E1',
  },
  chipActive: { backgroundColor: '#1B5E4A', borderColor: '#1B5E4A' },
  chipText: {
    fontSize: 12, fontWeight: '600', color: '#5F6B7A',
    fontFamily: FontFamily.semibold,
  },
  chipTextActive: { color: '#FFF' },
  sortRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginTop: 10, gap: 8,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E8E6E1',
  },
  sortBtnActive: { backgroundColor: 'rgba(27, 94, 74, 0.08)', borderColor: '#1B5E4A30' },
  sortText: {
    fontSize: 11, fontWeight: '500', color: '#94A3B8',
    fontFamily: FontFamily.medium,
  },
  sortTextActive: { color: '#1B5E4A', fontWeight: '600' },

  listContent: {
    paddingHorizontal: 16, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 100 : 32,
  },

  // ── Lot Card ──
  lotCard: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: '#E8E6E1',
    marginBottom: 12, overflow: 'hidden',
    ...Shadows.card,
  },
  lotHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
  },
  commodityIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  lotCommodity: {
    fontSize: 16, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },
  lotNumber: {
    fontSize: 11, color: '#94A3B8', marginTop: 2,
    fontFamily: FontFamily.regular, letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10, fontWeight: '700',
    fontFamily: FontFamily.bold, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Weight ──
  weightSection: { paddingHorizontal: 16, paddingBottom: 14 },
  weightLabels: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6,
  },
  weightValue: {
    fontSize: 14, fontWeight: '700', color: '#1A1A2E',
    fontFamily: FontFamily.bold, fontVariant: ['tabular-nums'] as any,
  },
  weightOf: {
    fontSize: 11, color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },
  weightBar: {
    height: 5, borderRadius: 3, backgroundColor: '#F0EDE8', overflow: 'hidden',
  },
  weightFill: { height: '100%' as any, borderRadius: 3 },

  // ── Footer ──
  lotFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
    gap: 6,
  },
  footerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  footerText: {
    fontSize: 11, color: '#5F6B7A',
    fontFamily: FontFamily.medium,
  },
  footerRent: {
    fontSize: 12, fontWeight: '700', color: '#D9A441',
    fontFamily: FontFamily.bold, fontVariant: ['tabular-nums'] as any,
  },
  footerDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
});
