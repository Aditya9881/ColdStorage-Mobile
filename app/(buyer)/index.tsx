/**
 * SheetKosh — Premium Buyer Browse Screen
 *
 * Features:
 * - Teal gradient header with sticky search
 * - Commodity filter chips with icons
 * - Grade + Sort filters
 * - Redesigned listing cards with commodity icon, weight, grade star
 * - Skeleton loading, Error state
 * - Haptic feedback
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, useColorScheme, Platform,
  Animated as RNAnimated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows, Gradients } from '@/constants/Colors';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/ui/SearchBar';
import SyncBadge from '@/components/SyncBadge';
import { hapticLight, hapticSelection } from '@/lib/haptics';

const COMMODITY_FILTERS = [
  { label: 'All', icon: 'grid-outline', value: '' },
  { label: 'Potato', icon: 'nutrition-outline', value: 'Potato' },
  { label: 'Onion', icon: 'ellipse-outline', value: 'Onion' },
  { label: 'Apple', icon: 'nutrition', value: 'Apple' },
  { label: 'Mango', icon: 'leaf-outline', value: 'Mango' },
  { label: 'Wheat', icon: 'sunny-outline', value: 'Wheat' },
  { label: 'Rice', icon: 'water-outline', value: 'Rice' },
];

const GRADE_FILTERS = ['All', 'A', 'B', 'C'];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
  { label: 'Weight ↓', value: 'weight_desc' },
];

const COMMODITY_ICON: Record<string, string> = {
  Potato: 'nutrition-outline', Onion: 'ellipse-outline', Tomato: 'ellipse',
  Apple: 'nutrition', Mango: 'leaf-outline', Garlic: 'flower-outline',
  Ginger: 'leaf', Wheat: 'sunny-outline', Rice: 'water-outline',
  default: 'cube-outline',
};

export default function BuyerBrowseScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedSort, setSelectedSort] = useState('newest');
  const headerAnim = useRef(new RNAnimated.Value(0)).current;

  const fetchListings = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/marketplace/listings?limit=50&status=ACTIVE');
      if (res.success && res.data?.listings) {
        setListings(res.data.listings);
      }
    } catch (err) {
      console.error('Browse error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchListings();
  }, [fetchListings, isAuthenticated]);

  useEffect(() => {
    RNAnimated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = [...listings];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.lot?.commodityName?.toLowerCase().includes(q) ||
        l.seller?.fullName?.toLowerCase().includes(q)
      );
    }

    if (selectedCommodity) {
      result = result.filter(l =>
        l.lot?.commodityName?.toLowerCase().includes(selectedCommodity.toLowerCase())
      );
    }

    if (selectedGrade !== 'All') {
      result = result.filter(l => l.lot?.qualityGrade === selectedGrade);
    }

    // Sort
    switch (selectedSort) {
      case 'price_asc':
        result.sort((a, b) => Number(a.askingPricePerKg) - Number(b.askingPricePerKg));
        break;
      case 'price_desc':
        result.sort((a, b) => Number(b.askingPricePerKg) - Number(a.askingPricePerKg));
        break;
      case 'weight_desc':
        result.sort((a, b) => Number(b.lot?.currentWeightKg || 0) - Number(a.lot?.currentWeightKg || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [listings, search, selectedCommodity, selectedGrade, selectedSort]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={Gradients.buyer} style={styles.header}>
          <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
          <Text style={styles.headerTitle}>Browse Produce</Text>
        </LinearGradient>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState variant="network" onRetry={fetchListings} />
      </View>
    );
  }

  const renderListing = ({ item }: { item: any }) => {
    const commodity = item.lot?.commodityName || 'Unknown';
    const icon = COMMODITY_ICON[commodity] || COMMODITY_ICON.default;
    const weight = Number(item.lot?.currentWeightKg || 0);
    const grade = item.lot?.qualityGrade || '—';
    const price = Number(item.askingPricePerKg || 0);
    const totalValue = price * weight;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        onPress={() => { router.push(`/listing/${item.id}`); hapticLight(); }}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.commodityCircle, { backgroundColor: colors.buyerSubtle }]}>
            <Ionicons name={icon as any} size={24} color={colors.buyerPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.commodityName, { color: colors.text }]}>{commodity}</Text>
            <Text style={[styles.sellerName, { color: colors.textTertiary }]}>
              by {item.seller?.fullName || 'Unknown Seller'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.priceMain, { color: colors.buyerPrimary }]}>₹{price.toFixed(0)}</Text>
            <Text style={[styles.priceUnit, { color: colors.textTertiary }]}>per kg</Text>
          </View>
        </View>

        {/* Info chips row */}
        <View style={styles.chipsRow}>
          <View style={[styles.infoChip, { backgroundColor: colors.cardAlt }]}>
            <Ionicons name="scale-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
              {(weight / 1000).toFixed(1)} MT
            </Text>
          </View>
          {grade !== '—' && (
            <View style={[styles.infoChip, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.chipLabel, { color: '#D97706' }]}>Grade {grade}</Text>
            </View>
          )}
          <View style={[styles.infoChip, { backgroundColor: colors.cardAlt }]}>
            <Ionicons name="wallet-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
              Total ₹{(totalValue / 1000).toFixed(0)}k
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.orderBtn, { backgroundColor: colors.buyerPrimary }]}
            onPress={() => { router.push(`/place-order/${item.id}`); hapticLight(); }}
          >
            <Ionicons name="cart" size={14} color="#FFF" />
            <Text style={styles.orderBtnText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={Gradients.buyer} style={styles.header}>
        <View style={{ height: Platform.OS === 'ios' ? 54 : 36 }} />
        <RNAnimated.View style={{ opacity: headerAnim }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting}>Welcome, {user?.fullName || 'Buyer'}</Text>
              <Text style={styles.headerTitle}>Browse Produce</Text>
            </View>
            <SyncBadge />
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search commodity, seller..." />
        </RNAnimated.View>
      </LinearGradient>

      {/* Commodity filter chips */}
      <FlatList
        data={COMMODITY_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.value || 'all'}
        contentContainerStyle={styles.filterChips}
        style={[styles.filterRow, { backgroundColor: colors.card }]}
        renderItem={({ item }) => {
          const active = selectedCommodity === item.value;
          return (
            <TouchableOpacity
              style={[
                styles.commodityChip,
                active ? { backgroundColor: colors.buyerPrimary } : { backgroundColor: colors.cardAlt },
              ]}
              onPress={() => { setSelectedCommodity(item.value); hapticSelection(); }}
            >
              <Ionicons name={item.icon as any} size={14} color={active ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.commodityChipText, { color: active ? '#FFF' : colors.textSecondary }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Grade + Sort row */}
      <View style={[styles.secondFilterRow, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.gradeRow}>
          <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>Grade:</Text>
          {GRADE_FILTERS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.gradeBtn, selectedGrade === g && { backgroundColor: `${colors.buyerPrimary}15` }]}
              onPress={() => { setSelectedGrade(g); hapticSelection(); }}
            >
              <Text style={[styles.gradeText, { color: selectedGrade === g ? colors.buyerPrimary : colors.textTertiary }]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortBtn, selectedSort === s.value && { backgroundColor: `${colors.buyerPrimary}15` }]}
              onPress={() => { setSelectedSort(s.value); hapticSelection(); }}
            >
              <Text style={[styles.sortText, { color: selectedSort === s.value ? colors.buyerPrimary : colors.textTertiary }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={[styles.resultsText, { color: colors.textTertiary }]}>
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Listing list */}
      <FlatList
        data={filtered}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.buyerPrimary} />}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title={search || selectedCommodity ? 'No Results' : 'No Listings Available'}
            subtitle={search || selectedCommodity ? 'Try different filters or search terms' : 'No produce is listed for sale right now. Check back soon!'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerGreeting: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  filterRow: {
    paddingVertical: Spacing.sm,
  },
  filterChips: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  commodityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  commodityChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
  },
  secondFilterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
  },
  gradeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gradeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sortBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sortText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    fontFamily: 'Inter_500Medium',
  },
  resultsBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resultsText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 100 : 32,
  },
  // Card
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commodityCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commodityName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    fontFamily: 'Inter_700Bold',
  },
  sellerName: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  priceMain: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'Inter_800ExtraBold',
  },
  priceUnit: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    fontFamily: 'Inter_500Medium',
  },
  cardActions: {
    marginTop: Spacing.md,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  orderBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
});
