/**
 * ColdStorage — Premium Pocket Ledger (Inventory) Screen
 *
 * Premium redesign:
 * - Rich custom hero header
 * - Better summary strip for active lots, weight, and rent
 * - Premium filter chips + sort pills
 * - Refined lot cards with stronger hierarchy
 * - Warm agri-fintech product styling
 * - All API calls unchanged
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline',
  ONION: 'ellipse-outline',
  VEGETABLES: 'leaf-outline',
  FRUITS: 'nutrition',
  GRAINS: 'sunny-outline',
  DAIRY: 'water-outline',
  SPICES: 'flame-outline',
  OTHER: 'cube-outline',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  STORED: {
    label: 'Stored',
    color: '#086C4B',
    bg: '#E8F7EF',
    border: '#BFE6CE',
    icon: 'checkmark-circle',
  },
  PARTIALLY_RELEASED: {
    label: 'Partial',
    color: '#8A5A0F',
    bg: '#FFF6E1',
    border: '#F1DEAD',
    icon: 'pie-chart-outline',
  },
  FULLY_RELEASED: {
    label: 'Released',
    color: '#55616C',
    bg: '#F3F5F7',
    border: '#E5E9ED',
    icon: 'exit-outline',
  },
  INTAKE_PENDING: {
    label: 'Pending',
    color: '#155E75',
    bg: '#E7F9FD',
    border: '#BDECF7',
    icon: 'time-outline',
  },
  EXPIRED: {
    label: 'Expired',
    color: '#A33434',
    bg: '#FFF0F0',
    border: '#F6C9C9',
    icon: 'alert-circle-outline',
  },
};

const FILTERS = [
  { key: 'All', label: 'All', status: '' },
  { key: 'Stored', label: 'Stored', status: 'STORED' },
  { key: 'Partial', label: 'Partial', status: 'PARTIALLY_RELEASED' },
  { key: 'Pending', label: 'Pending', status: 'INTAKE_PENDING' },
  { key: 'Released', label: 'Released', status: 'FULLY_RELEASED' },
] as const;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'weight', label: 'Heaviest', icon: 'scale-outline' },
  { key: 'rent', label: 'Most Rent', icon: 'wallet-outline' },
] as const;

const UI = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FBF8',
  border: '#E2E9E3',
  text: '#16241D',
  textMuted: '#708078',
  textSoft: '#95A19B',
  forest: '#103E34',
  forestDeep: '#082B24',
  teal: '#0D8D8A',
  emerald: '#17A56D',
  gold: '#D29424',
  goldSoft: '#FFF6E1',
};

export default function InventoryScreen() {
  const router = useRouter();
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

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLots();
    setRefreshing(false);
  };

  const filteredLots = useMemo(() => {
    let result = [...lots];
    const filterConfig = FILTERS.find((f) => f.key === activeFilter);

    if (filterConfig?.status) {
      result = result.filter((l) => l.status === filterConfig.status);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
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
      result.sort(
        (a, b) =>
          new Date(b.intakeDate || 0).getTime() -
          new Date(a.intakeDate || 0).getTime()
      );
    }

    return result;
  }, [lots, activeFilter, search, sortBy]);

  const summary = useMemo(() => {
    const active = lots.filter(
      (l) => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED'
    );

    return {
      count: active.length,
      weight: active.reduce((s, l) => s + Number(l.currentWeightKg || 0), 0),
      rent: active.reduce((s, l) => s + (l.estimatedRent || 0), 0),
    };
  }, [lots]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar
            barStyle="light-content"
            translucent
            backgroundColor="transparent"
          />
          <LinearGradient
            colors={[UI.forestDeep, UI.forest, '#087B73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroLoading}
          >
            <View style={{ height: Platform.OS === 'ios' ? 54 : 34 }} />
            <Text style={styles.heroLoadingTitle}>Pocket Ledger</Text>
          </LinearGradient>
          <SkeletonList count={4} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ErrorState variant="network" onRetry={fetchLots} />
        </View>
      </>
    );
  }

  const renderLot = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.STORED;
    const weight = Number(item.currentWeightKg || 0);
    const intakeWeight = Number(item.intakeWeightKg || weight);
    const weightPercent =
      intakeWeight > 0 ? Math.min(100, (weight / intakeWeight) * 100) : 100;
    const days = item.daysSinceIntake || 0;
    const commodityIcon =
      COMMODITY_ICON[item.commodityCategory] || 'cube-outline';

    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => {
          router.push(`/lots/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.82}
      >
        <View style={styles.lotCardTop}>
          <View
            style={[
              styles.commodityIcon,
              { backgroundColor: `${status.color}12` },
            ]}
          >
            <Ionicons name={commodityIcon as any} size={22} color={status.color} />
          </View>

          <View style={styles.lotTextWrap}>
            <Text style={styles.lotCommodity} numberOfLines={1}>
              {item.commodityName || 'Unknown'}
            </Text>
            <Text style={styles.lotNumber}>{item.lotNumber || '—'}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: status.bg,
                borderColor: status.border,
              },
            ]}
          >
            <Ionicons name={status.icon as any} size={11} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.metricStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CURRENT</Text>
            <Text style={styles.metricValue}>
              {(weight / 1000).toFixed(2)} MT
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>INTAKE</Text>
            <Text style={styles.metricValue}>
              {(intakeWeight / 1000).toFixed(2)} MT
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>RENT</Text>
            <Text style={styles.metricValueGold}>
              ₹{(item.estimatedRent || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Weight retained</Text>
            <Text style={styles.progressValue}>{weightPercent.toFixed(0)}%</Text>
          </View>

          <View style={styles.weightBar}>
            <LinearGradient
              colors={
                weightPercent < 50
                  ? ['#EF4444', '#F87171']
                  : weightPercent < 80
                  ? ['#F59E0B', '#FBBF24']
                  : ['#10B981', '#34D399']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.weightFill, { width: `${weightPercent}%` as any }]}
            />
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Ionicons
              name="business-outline"
              size={12}
              color={UI.textSoft}
            />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.facility?.name || '—'}
            </Text>
          </View>

          <View style={styles.footerDot} />

          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={12} color={UI.textSoft} />
            <Text style={styles.footerText}>
              {days}d in storage
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <LinearGradient
          colors={[UI.forestDeep, UI.forest, '#087B73']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <View
            style={{
              height: Platform.OS === 'ios' ? 58 : 34,
            }}
          />

          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>INVENTORY OVERVIEW</Text>
            <Text style={styles.heroTitle}>Pocket Ledger</Text>
            <Text style={styles.heroSubtitle}>
              Track stored lots, retained weight, and running rental exposure.
            </Text>

            <View style={styles.searchWrap}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search lots, commodity, facility..."
              />
            </View>

            <View style={styles.summaryStrip}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.count}</Text>
                <Text style={styles.summaryLabel}>ACTIVE LOTS</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {(summary.weight / 1000).toFixed(1)} MT
                </Text>
                <Text style={styles.summaryLabel}>STORED</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValueGold}>
                  ₹{summary.rent.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.summaryLabel}>RENT</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.controlsWrap}>
          <FlatList
            data={FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => {
              const active = activeFilter === item.key;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.82}
                  onPress={() => {
                    setActiveFilter(item.key);
                    hapticSelection();
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sortPill, active && styles.sortPillActive]}
                  activeOpacity={0.82}
                  onPress={() => {
                    setSortBy(opt.key);
                    hapticSelection();
                  }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={12}
                    color={active ? UI.forest : UI.textSoft}
                  />
                  <Text
                    style={[
                      styles.sortPillText,
                      active && styles.sortPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filteredLots}
          renderItem={renderLot}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI.forest}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title={search ? 'No matching lots' : 'No lots yet'}
              subtitle={
                search
                  ? 'Try a different lot number, commodity, or facility.'
                  : 'Your inventory lots will appear here once produce is stored at a facility.'
              }
              action={
                search
                  ? undefined
                  : {
                      label: 'Find Storage',
                      onPress: () => router.push('/(tabs)/discover'),
                    }
              }
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  heroLoading: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  heroLoadingTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  hero: {
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  heroGlowTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(42, 199, 171, 0.14)',
  },

  heroGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 180,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  heroContent: {
    paddingHorizontal: 16,
  },

  heroEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  heroSubtitle: {
    marginTop: 8,
    maxWidth: '88%',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 20,
  },

  searchWrap: {
    marginTop: 16,
  },

  summaryStrip: {
    marginTop: 18,
    minHeight: 84,
    borderRadius: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  summaryValueGold: {
    color: '#F0C56B',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  summaryLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  controlsWrap: {
    paddingTop: 16,
    paddingBottom: 4,
  },

  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterChipActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  filterChipText: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },

  sortPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E6ECE6',
    backgroundColor: UI.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  sortPillActive: {
    backgroundColor: '#EEF6F1',
    borderColor: '#BFD9CA',
  },

  sortPillText: {
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },

  sortPillTextActive: {
    color: UI.forest,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  lotCard: {
    marginBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    padding: 16,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  lotCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commodityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lotTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  lotCommodity: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  lotNumber: {
    marginTop: 4,
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.35,
  },

  statusBadge: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },

  metricStrip: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
  },

  metricItem: {
    flex: 1,
    alignItems: 'center',
  },

  metricLabel: {
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  metricValue: {
    marginTop: 5,
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },

  metricValueGold: {
    marginTop: 5,
    color: UI.gold,
    fontSize: 13,
    fontWeight: '800',
  },

  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E4EAE4',
  },

  progressWrap: {
    marginTop: 16,
  },

  progressTopRow: {
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressTitle: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  progressValue: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '800',
  },

  weightBar: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#EDF1ED',
    overflow: 'hidden',
  },

  weightFill: {
    height: '100%' as any,
    borderRadius: 999,
  },

  footerRow: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },

  footerText: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 180,
  },

  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D2D9D3',
  },
});