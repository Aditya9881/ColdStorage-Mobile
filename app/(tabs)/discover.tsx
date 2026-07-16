/**
 * ColdStorage — Premium Discover Screen (Authenticated Farmer View)
 *
 * Premium redesign:
 * - Elegant discovery hero
 * - Fixed state filter section with proper spacing and chip sizing
 * - Premium facility cards with capacity and trust markers
 * - Cleaner action buttons and result hierarchy
 * - Warm agri-fintech styling
 * - Verified facilities only
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
import ProgressRing from '@/components/ui/ProgressRing';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const INDIAN_STATES = [
  'All',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Gujarat',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Bihar',
  'West Bengal',
];

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
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  gold: '#D29424',
  goldSoft: '#FFF6E1',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
};

export default function DiscoverScreen() {
  const router = useRouter();

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
        const facs = Array.isArray(res.data)
          ? res.data
          : res.data.facilities || [];
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

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFacilities();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = [...facilities];

    if (selectedState !== 'All') {
      result = result.filter((f) => f.state === selectedState);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
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
    facilities.forEach((f) => {
      counts[f.state] = (counts[f.state] || 0) + 1;
    });
    return counts;
  }, [facilities]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.screen}>
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
            <Text style={styles.heroLoadingTitle}>Discover Storage</Text>
            <Text style={styles.heroLoadingSub}>
              Find verified cold storages
            </Text>
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
        <View style={styles.screen}>
          <ErrorState variant="network" onRetry={fetchFacilities} />
        </View>
      </>
    );
  }

  const gradientSets = [
    ['#059669', '#10B981'],
    ['#0891B2', '#22D3EE'],
    ['#7C3AED', '#A78BFA'],
    ['#D97706', '#FBBF24'],
    ['#DC2626', '#F87171'],
  ];

  const renderFacility = ({ item, index }: { item: any; index: number }) => {
    const totalCap = Number(item.totalCapacity ?? item.totalCapacityMt ?? 0);
    const chambers = item.chambers || [];
    const occupiedMt = chambers.reduce(
      (sum: number, c: any) => sum + Number(c.occupiedMt || 0),
      0
    );
    const availableMt = Math.max(0, totalCap - occupiedMt);
    const usedPercent = totalCap > 0 ? Math.round((occupiedMt / totalCap) * 100) : 0;
    const rating = Number(item.averageRating || 0);
    const reviewCount = Number(item.reviewCount || 0);
    const isVerified = !!item.verifiedAt;
    const gradColors = gradientSets[index % gradientSets.length];

    const tempText =
      item.chambers &&
      item.chambers.length > 0 &&
      item.chambers[0].targetTempMin !== undefined &&
      item.chambers[0].targetTempMax !== undefined
        ? `${Number(item.chambers[0].targetTempMin)}–${Number(
            item.chambers[0].targetTempMax
          )}°C`
        : 'Cold Storage';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push(`/facility/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.82}
      >
        <View style={styles.cardTop}>
          <LinearGradient
            colors={gradColors as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardIcon}
          >
            <Ionicons name="snow-outline" size={20} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>

              {isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color={UI.emerald}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={UI.textSoft}
              />
              <Text style={styles.locationText}>
                {item.city}, {item.state}
              </Text>
            </View>
          </View>

          {rating > 0 ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={UI.gold} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount > 0 ? (
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.capacityStrip}>
          <View style={styles.capacityTextWrap}>
            <Text style={styles.capacityLabel}>AVAILABLE CAPACITY</Text>
            <Text style={styles.capacityValue}>
              {availableMt.toLocaleString('en-IN')} MT
            </Text>
            <Text style={styles.capacitySubValue}>
              available of {totalCap.toLocaleString('en-IN')} MT
            </Text>

            <View style={styles.capacityBar}>
              <LinearGradient
                colors={
                  usedPercent > 85
                    ? ['#EF4444', '#F87171']
                    : usedPercent > 60
                    ? ['#F59E0B', '#FBBF24']
                    : ['#10B981', '#34D399']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.capacityFill,
                  { width: `${Math.min(usedPercent, 100)}%` as any },
                ]}
              />
            </View>
          </View>

          <View style={styles.ringWrap}>
            <ProgressRing
              percent={usedPercent}
              size={54}
              strokeWidth={4}
              label={`${usedPercent}%`}
              sublabel="used"
            />
          </View>
        </View>

        <View style={styles.tagsRow}>
          {item.storageType ? (
            <View style={styles.tag}>
              <Ionicons
                name="cube-outline"
                size={11}
                color={UI.textMuted}
              />
              <Text style={styles.tagText}>{item.storageType}</Text>
            </View>
          ) : null}

          <View style={styles.tag}>
            <Ionicons
              name="thermometer-outline"
              size={11}
              color={UI.textMuted}
            />
            <Text style={styles.tagText}>{tempText}</Text>
          </View>

          {chambers.length > 0 ? (
            <View style={styles.tag}>
              <Ionicons
                name="grid-outline"
                size={11}
                color={UI.textMuted}
              />
              <Text style={styles.tagText}>{chambers.length} Chambers</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.82}
            onPress={() => {
              hapticLight();
              router.push({
                pathname: '/book-storage',
                params: {
                  facilityId: item.id,
                  facilityName: item.name,
                },
              } as any);
            }}
          >
            <LinearGradient
              colors={[UI.forestDeep, UI.forest, '#087B73']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bookGradient}
            >
              <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
              <Text style={styles.bookText}>Book Storage</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsBtn}
            activeOpacity={0.82}
            onPress={() => {
              router.push(`/facility/${item.id}`);
              hapticLight();
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={UI.forest}
            />
            <Text style={styles.detailsText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color={UI.forest} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
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
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>VERIFIED NETWORK</Text>
                <Text style={styles.heroTitle}>Discover Storage</Text>
                <Text style={styles.heroSubtitle}>
                  Explore trusted cold storage facilities across supported states.
                </Text>
              </View>

              <View style={styles.platformBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={13}
                  color="#8EF0C6"
                />
                <Text style={styles.platformBadgeText}>Verified</Text>
              </View>
            </View>

            <View style={styles.heroStatsStrip}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{facilities.length}</Text>
                <Text style={styles.heroStatLabel}>FACILITIES</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {selectedState === 'All' ? 'All' : selectedState.split(' ')[0]}
                </Text>
                <Text style={styles.heroStatLabel}>STATE</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{filtered.length}</Text>
                <Text style={styles.heroStatLabel}>RESULTS</Text>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search facility, city, state or pincode..."
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.filtersWrap}>
          <FlatList
            data={INDIAN_STATES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterChipsContent}
            style={styles.filterList}
            renderItem={({ item }) => {
              const active = selectedState === item;
              const count = item === 'All' ? facilities.length : stateCounts[item] || 0;

              return (
                <TouchableOpacity
                  style={[styles.stateChip, active && styles.stateChipActive]}
                  activeOpacity={0.82}
                  onPress={() => {
                    setSelectedState(item);
                    hapticSelection();
                  }}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      active && styles.stateChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>

                  {count > 0 ? (
                    <View
                      style={[
                        styles.stateBadge,
                        active && styles.stateBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stateBadgeText,
                          active && styles.stateBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {filtered.length} facilit{filtered.length === 1 ? 'y' : 'ies'} found
            </Text>

            <View style={styles.sortPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={12}
                color={UI.forest}
              />
              <Text style={styles.sortText}>Verified only</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={filtered}
          renderItem={renderFacility}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
              icon="compass-outline"
              title={search ? 'No matching facilities' : 'No facilities'}
              subtitle={
                search
                  ? 'Try a different search term or state filter.'
                  : 'No verified cold storage facilities found.'
              }
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
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

  heroLoadingSub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    fontWeight: '500',
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

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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

  platformBadge: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  platformBadgeText: {
    color: '#8EF0C6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  heroStatsStrip: {
    marginTop: 22,
    minHeight: 82,
    borderRadius: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
  },

  heroStatLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  searchWrap: {
    marginTop: 16,
  },

  filtersWrap: {
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: UI.canvas,
  },

  filterList: {
    flexGrow: 0,
  },

  filterChipsContent: {
    paddingLeft: 16,
    paddingRight: 24,
    gap: 10,
  },

  stateChip: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  stateChipActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  stateChipText: {
    color: UI.textMuted,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 140,
  },

  stateChipTextActive: {
    color: '#FFFFFF',
  },

  stateBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#EEF2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  stateBadgeText: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },

  stateBadgeTextActive: {
    color: '#FFFFFF',
  },

  resultsBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultsText: {
    color: UI.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },

  sortPill: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: '#EEF6F1',
    borderWidth: 1,
    borderColor: '#CFE2D6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  sortText: {
    color: UI.forest,
    fontSize: 11,
    fontWeight: '700',
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 108 : 90,
  },

  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cardName: {
    flex: 1,
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#DFF7EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  locationText: {
    color: UI.textSoft,
    fontSize: 12,
    fontWeight: '500',
  },

  ratingPill: {
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: UI.goldSoft,
    borderWidth: 1,
    borderColor: '#F1DEAD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  ratingValue: {
    color: UI.gold,
    fontSize: 13,
    fontWeight: '800',
  },

  reviewCount: {
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '600',
  },

  capacityStrip: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
  },

  capacityTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  capacityLabel: {
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  capacityValue: {
    marginTop: 5,
    color: UI.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  capacitySubValue: {
    marginTop: 3,
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  capacityBar: {
    marginTop: 10,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E9EEE9',
    overflow: 'hidden',
  },

  capacityFill: {
    height: '100%' as any,
    borderRadius: 999,
  },

  ringWrap: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tagsRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FAFCFA',
    borderWidth: 1,
    borderColor: '#E4EAE4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  tagText: {
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },

  bookBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },

  bookGradient: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  bookText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  detailsBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE2D6',
    backgroundColor: '#EEF6F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  detailsText: {
    color: UI.forest,
    fontSize: 13,
    fontWeight: '800',
  },
});