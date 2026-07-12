import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const WATCHLIST_KEY = 'buyer_watchlist';

const COMMODITY_ICON: Record<string, string> = {
  Potato: 'nutrition-outline', Onion: 'ellipse-outline', Tomato: 'ellipse',
  Apple: 'nutrition', Mango: 'leaf-outline', Garlic: 'flower-outline',
  Ginger: 'leaf', Wheat: 'sunny-outline', Rice: 'water-outline', default: 'cube-outline',
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const isBuyer = user?.role === 'BUYER';

  useEffect(() => {
    fetchListing();
    checkWatchlist();
  }, [id]);

  async function fetchListing() {
    try {
      // Try direct endpoint first, fallback to list filter
      const res = await api.get<any>(`/marketplace/listings/${id}`);
      if (res.success && res.data) {
        setListing(res.data);
      } else {
        // Fallback: get from list
        const listRes = await api.get<any>('/marketplace/listings?limit=100');
        if (listRes.success) {
          const found = listRes.data?.listings?.find((l: any) => l.id === id);
          setListing(found || null);
        }
      }
    } catch {
      try {
        const listRes = await api.get<any>('/marketplace/listings?limit=100');
        if (listRes.success) {
          const found = listRes.data?.listings?.find((l: any) => l.id === id);
          setListing(found || null);
        }
      } catch (err) { console.error(err); }
    } finally {
      setLoading(false);
    }
  }

  async function checkWatchlist() {
    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        const saved: any[] = JSON.parse(raw);
        setIsWatchlisted(saved.some(item => item.id === id));
      }
    } catch {}
  }

  async function toggleWatchlist() {
    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
      let saved: any[] = raw ? JSON.parse(raw) : [];
      if (isWatchlisted) {
        saved = saved.filter(item => item.id !== id);
        setIsWatchlisted(false);
      } else {
        saved.push({ ...listing, _savedAt: new Date().toISOString() });
        setIsWatchlisted(true);
      }
      await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(saved));
    } catch {}
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={BUYER_PRIMARY} /></View>;
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#6B7280', fontSize: FontSize.md }}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: BUYER_PRIMARY, fontWeight: FontWeight.semibold }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lot = listing.lot || {};
  const iconName = COMMODITY_ICON[lot.commodityName] || COMMODITY_ICON.default;
  const price = Number(listing.askingPricePerKg);
  const weightMT = (Number(lot.currentWeightKg) / 1000).toFixed(2);
  const totalValue = (price * Number(lot.currentWeightKg)).toLocaleString();
  const minQty = Number(listing.minQuantityKg) || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <LinearGradient colors={['#134E4A', BUYER_PRIMARY, '#14B8A6']} style={styles.heroGradient}>
        <View style={styles.heroIconBox}>
          <Ionicons name={iconName as any} size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.heroCommodity}>{lot.commodityName}</Text>
        <Text style={styles.heroLocation}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" /> {lot.facility?.name}, {lot.facility?.city}, {lot.facility?.state}
        </Text>
        {isBuyer && (
          <TouchableOpacity style={styles.watchlistBtn} onPress={toggleWatchlist} activeOpacity={0.7}>
            <Ionicons name={isWatchlisted ? 'bookmark' : 'bookmark-outline'} size={18} color={isWatchlisted ? '#FBBF24' : '#FFF'} />
            <Text style={styles.watchlistBtnText}>{isWatchlisted ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Price Card */}
      <View style={[styles.priceCard, { marginTop: -24 }]}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>Asking Price</Text>
            <Text style={styles.priceValue}>₹{price.toFixed(0)}<Text style={styles.priceUnit}>/kg</Text></Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.priceLabel}>Total Value</Text>
            <Text style={styles.totalValue}>₹{totalValue}</Text>
          </View>
        </View>

        {minQty > 0 && (
          <View style={styles.minQtyBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#0891B2" />
            <Text style={styles.minQtyText}>Minimum order: {minQty} kg ({(minQty / 1000).toFixed(1)} MT)</Text>
          </View>
        )}
      </View>

      {/* Lot Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lot Information</Text>
        <View style={styles.statsGrid}>
          <StatBox icon="scale" label="Available" value={`${weightMT} MT`} color={BUYER_PRIMARY} />
          <StatBox icon="cube" label="Bags" value={lot.bagCount || '—'} color="#059669" />
          <StatBox icon="time" label="Days Stored" value={`${lot.daysSinceIntake || 0}d`} color="#D97706" />
          <StatBox icon="ribbon" label="Grade" value={lot.qualityGrade || 'N/A'} color="#0891B2" />
        </View>
        {lot.moistureContent && (
          <View style={styles.infoRow}>
            <Ionicons name="water-outline" size={16} color="#0891B2" />
            <Text style={styles.infoText}>Moisture Content: {Number(lot.moistureContent)}%</Text>
          </View>
        )}
      </View>

      {/* Facility Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storage Facility</Text>
        <View style={styles.facilityRow}>
          <View style={styles.facilityIconBox}>
            <Ionicons name="snow" size={24} color={BUYER_PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.facilityName}>{lot.facility?.name}</Text>
            <Text style={styles.facilityLocation}>{lot.facility?.city}, {lot.facility?.state}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/facility/${lot.facility?.id}`)} activeOpacity={0.7}>
            <Text style={styles.viewFacilityText}>View →</Text>
          </TouchableOpacity>
        </View>
        {lot.chamber && (
          <View style={styles.chamberRow}>
            <Ionicons name="thermometer-outline" size={14} color="#9CA3AF" />
            <Text style={styles.chamberText}>
              Chamber {lot.chamber?.chamberNumber} • {lot.chamber?.targetTempMin}°C to {lot.chamber?.targetTempMax}°C
            </Text>
          </View>
        )}
      </View>

      {/* IoT Snapshot (if available) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storage Conditions</Text>
        <Text style={styles.iotNote}>
          📡 This lot is monitored 24/7 via IoT sensors. Verified storage temperatures ensure produce quality at time of delivery.
        </Text>
        <View style={styles.iotBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.iotBadgeText}>IoT Monitored Facility</Text>
        </View>
      </View>

      {/* Seller Info */}
      {listing.seller && isBuyer && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>{listing.seller.fullName?.[0] || '?'}</Text>
            </View>
            <View>
              <Text style={styles.sellerName}>{listing.seller.fullName}</Text>
              <Text style={styles.sellerLocation}>{listing.seller.city}, {listing.seller.state}</Text>
            </View>
          </View>
        </View>
      )}

      {listing.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.descriptionText}>{listing.description}</Text>
        </View>
      )}

      {/* CTA */}
      {isBuyer && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push(`/place-order/${listing.id}`)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#134E4A', BUYER_PRIMARY]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="cart" size={20} color="#FFF" />
              <Text style={styles.ctaBtnText}>Place Order</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroGradient: { alignItems: 'center', paddingTop: 32, paddingBottom: 48, paddingHorizontal: Spacing.xl },
  heroIconBox: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  heroCommodity: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: '#FFF' },
  heroLocation: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.sm, textAlign: 'center' },
  watchlistBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, marginTop: Spacing.lg },
  watchlistBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  priceCard: { marginHorizontal: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.xl, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginBottom: 4 },
  priceValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: BUYER_PRIMARY },
  priceUnit: { fontSize: FontSize.md, fontWeight: FontWeight.regular, color: '#9CA3AF' },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  minQtyBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#ECFEFF', borderRadius: BorderRadius.sm, padding: Spacing.md, marginTop: Spacing.md },
  minQtyText: { fontSize: FontSize.sm, color: '#0891B2' },
  card: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#1A1A2E', marginBottom: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statBox: { width: '47%', alignItems: 'center', padding: Spacing.md, backgroundColor: '#FAFAFA', borderRadius: BorderRadius.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  infoText: { fontSize: FontSize.sm, color: '#6B7280' },
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  facilityIconBox: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  facilityName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  facilityLocation: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  viewFacilityText: { color: BUYER_PRIMARY, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  chamberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  chamberText: { fontSize: FontSize.sm, color: '#6B7280' },
  iotNote: { fontSize: FontSize.sm, color: '#6B7280', lineHeight: 20, marginBottom: Spacing.md },
  iotBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#ECFDF5', padding: Spacing.md, borderRadius: BorderRadius.sm },
  iotBadgeText: { fontSize: FontSize.sm, color: '#059669', fontWeight: FontWeight.semibold },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  sellerInitial: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  sellerName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  sellerLocation: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  descriptionText: { fontSize: FontSize.md, color: '#6B7280', lineHeight: 22, fontStyle: 'italic' },
  ctaContainer: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  ctaBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  ctaBtnText: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
});
