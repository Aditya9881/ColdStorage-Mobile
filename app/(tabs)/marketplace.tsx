/**
 * ColdStorage — Premium Marketplace Screen
 *
 * Premium redesign:
 * - Elegant custom hero header
 * - Segmented browse / my listings control
 * - Refined search area
 * - Premium marketplace cards with better hierarchy
 * - Warm agri-fintech styling
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

const STATUS_CONFIGS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  ACTIVE: { label: 'Active', color: '#086C4B', bg: '#E8F7EF', border: '#BFE6CE' },
  SOLD: { label: 'Sold', color: '#155E75', bg: '#E7F9FD', border: '#BDECF7' },
  EXPIRED: { label: 'Expired', color: '#55616C', bg: '#F3F5F7', border: '#E5E9ED' },
  CANCELLED: { label: 'Cancelled', color: '#A33434', bg: '#FFF0F0', border: '#F6C9C9' },
};

const GRADE_LABELS: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  A: { label: 'Premium', color: '#8A5A0F', bg: '#FFF6E1', border: '#F1DEAD' },
  B: { label: 'Grade A', color: '#086C4B', bg: '#E8F7EF', border: '#BFE6CE' },
  C: { label: 'Standard', color: '#55616C', bg: '#F3F5F7', border: '#E5E9ED' },
};

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
};

export default function MarketplaceScreen() {
  const router = useRouter();
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

      if (browseRes.success) {
        setListings(browseRes.data?.listings || []);
      }

      if (myRes.success) {
        setMyListings(myRes.data || []);
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const data = useMemo(() => {
    const source = tab === 'browse' ? listings : myListings;

    if (!search.trim()) return source;

    const q = search.toLowerCase();

    return source.filter((item: any) => {
      return (
        item.lot?.commodityName?.toLowerCase().includes(q) ||
        item.lot?.lotNumber?.toLowerCase().includes(q)
      );
    });
  }, [tab, listings, myListings, search]);

  const daysAgo = (date: string) => {
    if (!date) return 0;
    return Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

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
            <Text style={styles.heroLoadingTitle}>Marketplace</Text>
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
          <ErrorState variant="network" onRetry={fetchListings} />
        </View>
      </>
    );
  }

  const renderListing = ({ item }: { item: any }) => {
    const statusConfig = STATUS_CONFIGS[item.status] || STATUS_CONFIGS.ACTIVE;
    const grade = item.lot?.qualityGrade || '—';
    const gradeConfig = GRADE_LABELS[grade];
    const days = daysAgo(item.createdAt);
    const weight = Number(item.lot?.currentWeightKg || 0);
    const pricePerKg = Number(item.askingPricePerKg || 0);
    const totalValue = pricePerKg * weight;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push(`/listing/${item.id}`);
          hapticLight();
        }}
        activeOpacity={0.82}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.commodityIcon,
              { backgroundColor: `${statusConfig.color}12` },
            ]}
          >
            <Ionicons name="leaf-outline" size={22} color={statusConfig.color} />
          </View>

          <View style={styles.cardTitleWrap}>
            <Text style={styles.commodityName} numberOfLines={1}>
              {item.lot?.commodityName || 'Unknown'}
            </Text>
            <Text style={styles.lotNumber}>
              Lot #{item.lot?.lotNumber || '—'}
            </Text>
          </View>

          <View style={styles.priceWrap}>
            <Text style={styles.priceValue}>
              ₹{pricePerKg.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.priceUnit}>per kg</Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>WEIGHT</Text>
            <Text style={styles.metaValue}>{(weight / 1000).toFixed(1)} MT</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>VALUE</Text>
            <Text style={styles.metaValue}>
              ₹{Math.round(totalValue).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>POSTED</Text>
            <Text style={styles.metaValue}>{days > 0 ? `${days}d ago` : 'Today'}</Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {gradeConfig ? (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: gradeConfig.bg,
                  borderColor: gradeConfig.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: gradeConfig.color }]}>
                {gradeConfig.label}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.chip,
              {
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.border,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          <View style={styles.chip}>
            <Ionicons
              name="cube-outline"
              size={11}
              color={UI.textSoft}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.chipText, { color: UI.textMuted }]}>
              Ready to trade
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
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroEyebrow}>TRADING DESK</Text>
                <Text style={styles.heroTitle}>Marketplace</Text>
                <Text style={styles.heroSubtitle}>
                  Discover produce listings or manage your active offers.
                </Text>
              </View>

              {tab === 'mine' ? (
                <TouchableOpacity
                  style={styles.createBtn}
                  activeOpacity={0.82}
                  onPress={() => {
                    router.push('/listing/create');
                    hapticLight();
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>New</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.heroStatsStrip}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{listings.length}</Text>
                <Text style={styles.heroStatLabel}>LIVE LISTINGS</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{myListings.length}</Text>
                <Text style={styles.heroStatLabel}>MY LISTINGS</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>
                  {tab === 'browse' ? 'Browse' : 'Manage'}
                </Text>
                <Text style={styles.heroStatLabel}>MODE</Text>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search commodity, lot number..."
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.segmentWrap}>
          <View style={styles.segmentControl}>
            {(['browse', 'mine'] as const).map((t) => {
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  activeOpacity={0.82}
                  onPress={() => {
                    setTab(t);
                    hapticSelection();
                  }}
                >
                  <Ionicons
                    name={t === 'browse' ? 'storefront-outline' : 'pricetag-outline'}
                    size={15}
                    color={active ? UI.forest : UI.textSoft}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {t === 'browse'
                      ? `Browse (${listings.length})`
                      : `My Listings (${myListings.length})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={data}
          renderItem={renderListing}
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
              icon={tab === 'mine' ? 'pricetag-outline' : 'storefront-outline'}
              title={
                search
                  ? 'No matching listings'
                  : tab === 'mine'
                  ? 'No listings yet'
                  : 'No listings available'
              }
              subtitle={
                search
                  ? 'Try a different commodity or lot number.'
                  : tab === 'mine'
                  ? 'Create your first listing to start reaching buyers.'
                  : 'Check back soon for fresh produce listings.'
              }
              action={
                tab === 'mine'
                  ? {
                      label: 'Create Listing',
                      onPress: () => router.push('/listing/create'),
                    }
                  : undefined
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

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

  createBtn: {
    marginTop: 2,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    justifyContent: 'center',
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

  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },

  segmentControl: {
    backgroundColor: '#ECF1EC',
    borderRadius: 18,
    padding: 5,
    flexDirection: 'row',
  },

  segmentBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentBtnActive: {
    backgroundColor: UI.surface,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  segmentText: {
    color: UI.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },

  segmentTextActive: {
    color: UI.forest,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
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

  cardHeader: {
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

  cardTitleWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  commodityName: {
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

  priceWrap: {
    alignItems: 'flex-end',
  },

  priceValue: {
    color: UI.gold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  priceUnit: {
    marginTop: 2,
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },

  metaStrip: {
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

  metaBlock: {
    flex: 1,
    alignItems: 'center',
  },

  metaLabel: {
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  metaValue: {
    marginTop: 5,
    color: UI.text,
    fontSize: 13,
    fontWeight: '800',
  },

  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E4EAE4',
  },

  chipsRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4EAE4',
    backgroundColor: '#FAFCFA',
    flexDirection: 'row',
    alignItems: 'center',
  },

  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});