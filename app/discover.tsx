/**
 * ColdStorage Mobile — Premium Discover Screen
 *
 * Guest-first experience with:
 * - Live animated location display with address geocoding
 * - Hero stats banner (facilities count, commodities, avg prices)
 * - Live mandi price ticker cards
 * - Nearby facilities with rich cards (distance, rating, capacity bar, commodities)
 * - Trending commodities section
 * - Premium glassmorphism design throughout
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, TextInput, useColorScheme,
  Platform, Dimensions, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows, Gradients } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';
import LocationPrimer from '@/components/LocationPrimer';
import AuthWallModal from '@/components/AuthWallModal';

const { width } = Dimensions.get('window');

// ── Types ──
interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode?: string;
  storageType: string;
  totalCapacity: number;
  availableCapacity: number;
  avgRating?: number;
  reviewCount?: number;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  commodities?: string[];
  operatingSince?: string;
  status?: string;
  chambers?: { id: string; chamberNumber: string; name?: string; targetTempMin?: number; targetTempMax?: number; commodityCategory?: string }[];
}

interface MarketPrice {
  commodity: string;
  category: string;
  unit: string;
  mandis: { name: string; state: string; minPrice: number; maxPrice: number; modalPrice: number }[];
}

// ── Commodity Icon Map (Ionicons) ──
const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline', ONION: 'ellipse-outline', VEGETABLES: 'leaf-outline', FRUITS: 'nutrition',
  GRAINS: 'sunny-outline', DAIRY: 'water-outline', SPICES: 'flame-outline', OTHER: 'cube-outline',
};

const COMMODITY_COLORS: Record<string, string> = {
  POTATO: '#D97706', ONION: '#DC2626', VEGETABLES: '#059669', FRUITS: '#DC2626',
  GRAINS: '#CA8A04', DAIRY: '#0891B2', SPICES: '#EA580C', OTHER: '#6B7280',
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  // State machine
  const [uiState, setUiState] = useState<'primer' | 'loading' | 'loaded' | 'denied'>('primer');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth wall
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState('');

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;

  // ── Data Fetching ──
  const fetchAllData = useCallback(async (lat?: number, lng?: number) => {
    try {
      const [facilitiesRes, pricesRes] = await Promise.all([
        api.get<any>(`/discover/facilities?limit=50${lat ? `&latitude=${lat}&longitude=${lng}` : ''}`),
        api.get<any>('/market-prices'),
      ]);

      if (facilitiesRes.success && facilitiesRes.data) {
        // Handle both array and {facilities: [...]} response shapes
        const raw = Array.isArray(facilitiesRes.data) ? facilitiesRes.data : (facilitiesRes.data.facilities || []);
        // Only show ACTIVE (platform-registered & verified) facilities
        const platformOnly = raw.filter((f: any) => f.status === 'ACTIVE');
        setFacilities(platformOnly);
      }
      if (pricesRes.success && pricesRes.data) {
        setMarketPrices(Array.isArray(pricesRes.data) ? pricesRes.data : []);
      }
    } catch (err) {
      console.error('Discover fetch error:', err);
    }
  }, []);

  // ── Location Request ──
  const requestLocation = async () => {
    setUiState('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);

        // Reverse geocode for display
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (address) {
            const parts = [address.subregion || address.city, address.region].filter(Boolean);
            setLocationAddress(parts.join(', '));
          }
        } catch { setLocationAddress('Location detected'); }

        await fetchAllData(loc.coords.latitude, loc.coords.longitude);
        setUiState('loaded');
      } else {
        setUiState('denied');
        await fetchAllData();
      }
    } catch {
      setUiState('denied');
      await fetchAllData();
    }

    // Animate in
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const handleSkipLocation = async () => {
    setUiState('loading');
    await fetchAllData();
    setUiState('denied');
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await fetchAllData(location.coords.latitude, location.coords.longitude);
    } else {
      await fetchAllData();
    }
    setRefreshing(false);
  };

  // ── Auth Wall ──
  const handleGatedAction = (actionType: 'book' | 'buy' | 'details') => {
    const messages: Record<string, string> = {
      book: 'Sign in or register as a Farmer to book cold storage.',
      buy: 'Sign in or register as a Buyer to purchase produce.',
      details: 'Sign in to view detailed facility information.',
    };
    setAuthActionMessage(messages[actionType]);
    setAuthModalVisible(true);
  };

  // ── Filtered facilities ──
  const filteredFacilities = searchQuery
    ? facilities.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.pincode && f.pincode.includes(searchQuery))
      )
    : facilities;

  // ── Computed stats from real data ──
  const totalCapacity = facilities.reduce((sum, f) => sum + f.totalCapacity, 0);
  const avgRating = facilities.filter((f: any) => f.avgRating).length > 0
    ? (facilities.reduce((sum: number, f: any) => sum + (f.avgRating || 0), 0) / facilities.filter((f: any) => f.avgRating).length)
    : null;

  // ════════════════════════════════════════════════
  //  RENDER STATES
  // ════════════════════════════════════════════════

  if (uiState === 'primer') {
    return <LocationPrimer onAcknowledge={requestLocation} onSkip={handleSkipLocation} />;
  }

  if (uiState === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: '#0F2419' }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingPulse}>
          <ActivityIndicator size="large" color="#40916C" />
        </View>
        <Text style={styles.loadingTitle}>Discovering nearby facilities...</Text>
        <Text style={styles.loadingSubtitle}>Finding the best cold storage options for you</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════
  //  MAIN DISCOVER VIEW
  // ════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#40916C" />}
      >
        {/* ── Premium Hero Header ── */}
        <Animated.View style={{ opacity: headerFade }}>
          <LinearGradient
            colors={['#0F2419', '#1B4332', '#2D6A4F']}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Ionicons name="snow" size={18} color="#FBBF24" />
                </View>
                <View>
                  <Text style={styles.brandName}>SheetKosh</Text>
                  <Text style={styles.brandTagline}>India's Smart Cold Storage Network</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => { router.push('/(auth)/login'); hapticLight(); }}
              >
                <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Live Location Display */}
            <View style={styles.locationBar}>
              <View style={styles.locationDot} />
              {location ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>Your Location</Text>
                  <Text style={styles.locationValue}>
                    {locationAddress || `${location.coords.latitude.toFixed(4)}°N, ${location.coords.longitude.toFixed(4)}°E`}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationLabel}>Location not enabled</Text>
                  <Text style={styles.locationValue}>Showing all facilities across India</Text>
                </View>
              )}
              {!location && (
                <TouchableOpacity style={styles.enableLocBtn} onPress={requestLocation}>
                  <Ionicons name="navigate" size={14} color="#2D6A4F" />
                  <Text style={styles.enableLocText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{facilities.length}</Text>
                <Text style={styles.statLabel}>Facilities</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{(totalCapacity / 1000).toFixed(0)}K</Text>
                <Text style={styles.statLabel}>MT Capacity</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{marketPrices.length}</Text>
                <Text style={styles.statLabel}>Commodities</Text>
              </View>
              <View style={[styles.statDivider]} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{avgRating ? avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: contentSlide }] }}>
          {/* ── Search Bar ── */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search facility, city, state or pincode..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Live Market Prices ── */}
          {marketPrices.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.sectionTitle}>Live Mandi Prices</Text>
                </View>
                <Text style={styles.sectionSubtitle}>Updated today</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}>
                {marketPrices.map((price, idx) => {
                  const iconName = COMMODITY_ICON[price.category] || 'cube-outline';
                  const iconColor = COMMODITY_COLORS[price.category] || '#6B7280';
                  const cardGradients: [string, string][] = [
                    ['#FFF7ED', '#FFFBEB'], ['#F0FDF4', '#ECFDF5'], ['#FDF2F8', '#FFF1F2'],
                    ['#EFF6FF', '#F0F9FF'], ['#FFFBEB', '#FEF3C7'], ['#F0FDFA', '#ECFEFF'],
                  ];
                  const topMandi = price.mandis[0];
                  if (!topMandi) return null;
                  return (
                    <View key={idx} style={styles.priceCard}>
                      <LinearGradient
                        colors={cardGradients[idx % cardGradients.length]}
                        style={styles.priceCardInner}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      >
                        {/* Icon + Name row */}
                        <View style={styles.priceTopRow}>
                          <View style={[styles.priceIconBox, { backgroundColor: `${iconColor}18` }]}>
                            <Ionicons name={iconName as any} size={20} color={iconColor} />
                          </View>
                          <Text style={styles.priceCommodity} numberOfLines={2}>{price.commodity}</Text>
                        </View>

                        {/* Price */}
                        <Text style={[styles.priceValue, { color: iconColor }]}>₹{topMandi.modalPrice.toLocaleString('en-IN')}</Text>
                        <Text style={styles.priceUnit}>per {price.unit}</Text>

                        {/* Range + Mandi */}
                        <View style={styles.priceDivider} />
                        <View style={styles.priceRange}>
                          <Text style={styles.priceRangeText}>
                            ₹{topMandi.minPrice.toLocaleString('en-IN')} — ₹{topMandi.maxPrice.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={styles.priceMandiRow}>
                          <Ionicons name="location" size={9} color="#9CA3AF" />
                          <Text style={styles.priceMandi} numberOfLines={1}>{topMandi.name}</Text>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Nearby Facilities ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: '#2D6A4F' }]} />
                <Text style={styles.sectionTitle}>
                  {location ? 'Nearby Facilities' : 'All Facilities'}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>{filteredFacilities.length} found</Text>
            </View>

            {filteredFacilities.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No facilities found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search criteria</Text>
              </View>
            ) : (
              filteredFacilities.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={styles.facilityCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isAuthenticated) {
                      router.push(`/facility/${facility.id}`);
                    } else {
                      handleGatedAction('details');
                    }
                  }}
                >
                  {/* Card Header */}
                  <View style={styles.fcHeader}>
                    <View style={styles.fcIconBox}>
                      <LinearGradient
                        colors={[
                          ['#059669', '#10B981'],
                          ['#0891B2', '#22D3EE'],
                          ['#7C3AED', '#A78BFA'],
                        ][filteredFacilities.indexOf(facility) % 3] as any}
                        style={styles.fcIconGradient}
                      >
                        <Ionicons name="snow" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fcName} numberOfLines={1}>{facility.name}</Text>
                      <View style={styles.fcLocationRow}>
                        <Ionicons name="location" size={11} color="#9CA3AF" />
                        <Text style={styles.fcLocation}>
                          {facility.city}, {facility.state}
                        </Text>
                        {facility.distanceKm && (
                          <View style={styles.distanceBadge}>
                            <Ionicons name="navigate" size={8} color="#059669" />
                            <Text style={styles.distanceText}>
                              {Number(facility.distanceKm).toFixed(1)} km
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {/* Rating */}
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingValue}>
                        {facility.avgRating ? Number(facility.avgRating).toFixed(1) : 'New'}
                      </Text>
                    </View>
                  </View>

                  {/* Capacity Section — with gauge circle */}
                  {(() => {
                    const usedPct = facility.totalCapacity > 0
                      ? Math.round(((facility.totalCapacity - facility.availableCapacity) / facility.totalCapacity) * 100)
                      : 0;
                    const gaugeColor = usedPct > 85 ? '#EF4444' : usedPct > 60 ? '#F59E0B' : '#10B981';
                    return (
                      <View style={styles.capacitySection}>
                        <View style={styles.capacityRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.capacityLabel}>STORAGE CAPACITY</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                              <Text style={[styles.capacityAvail, { color: gaugeColor }]}>
                                {Math.round(facility.availableCapacity).toLocaleString('en-IN')} MT
                              </Text>
                              <Text style={styles.capacityTotal}>
                                {' '}of {facility.totalCapacity.toLocaleString('en-IN')} MT
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.gaugeCircle, { borderColor: gaugeColor + '30' }]}>
                            <Text style={[styles.gaugePercent, { color: gaugeColor }]}>{usedPct}%</Text>
                            <Text style={styles.gaugeLabel}>used</Text>
                          </View>
                        </View>
                        <View style={styles.capacityBarBg}>
                          <LinearGradient
                            colors={usedPct > 85 ? ['#EF4444', '#F87171'] : usedPct > 60 ? ['#F59E0B', '#FBBF24'] : ['#10B981', '#34D399']}
                            style={[styles.capacityBarFill, { width: `${Math.min(usedPct, 100)}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          />
                        </View>
                      </View>
                    );
                  })()}

                  {/* Info chips */}
                  <View style={styles.chipsRow}>
                    {facility.storageType && (
                      <View style={styles.chip}>
                        <Ionicons name="cube-outline" size={11} color="#6B7280" />
                        <Text style={styles.chipText}>{facility.storageType}</Text>
                      </View>
                    )}
                    <View style={styles.chip}>
                      <Ionicons name="thermometer-outline" size={11} color="#6B7280" />
                      <Text style={styles.chipText}>
                        {facility.chambers && facility.chambers.length > 0 && facility.chambers[0].targetTempMin
                          ? `${Number(facility.chambers[0].targetTempMin)}–${Number(facility.chambers[0].targetTempMax)}°C`
                          : 'Cold Storage'}
                      </Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: '#F0FFF4', borderColor: '#D1FAE5' }]}>
                      <Ionicons name="shield-checkmark" size={11} color="#059669" />
                      <Text style={[styles.chipText, { color: '#059669', fontWeight: '700' }]}>Verified</Text>
                    </View>
                  </View>

                  {/* Action row */}
                  <View style={styles.fcActions}>
                    <TouchableOpacity
                      style={styles.fcPrimaryBtn}
                      onPress={() => handleGatedAction('book')}
                    >
                      <LinearGradient
                        colors={['#2D6A4F', '#40916C']}
                        style={styles.fcBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="calendar-outline" size={15} color="#FFF" />
                        <Text style={styles.fcBtnPrimaryText}>Book Storage</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fcSecondaryBtn}
                      onPress={() => handleGatedAction('details')}
                    >
                      <Ionicons name="information-circle-outline" size={15} color="#2D6A4F" />
                      <Text style={styles.fcBtnSecondaryText}>View Details</Text>
                      <Ionicons name="chevron-forward" size={14} color="#2D6A4F" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Bottom CTA for guests */}
          {!isAuthenticated && (
            <View style={styles.guestCta}>
              <LinearGradient
                colors={['#1B4332', '#2D6A4F']}
                style={styles.guestCtaGradient}
              >
                <Text style={styles.guestCtaTitle}>Ready to Get Started?</Text>
                <Text style={{ fontSize: 12, color: '#FBBF24', fontWeight: '600', marginTop: 2, fontFamily: 'Inter_600SemiBold' }}>शीतकोष — Your Cold Storage Partner</Text>
                <Text style={styles.guestCtaSubtitle}>
                  Create your free account to book storage, buy produce, and access all features.
                </Text>
                <View style={styles.guestCtaBtns}>
                  <TouchableOpacity
                    style={styles.guestCtaSignUp}
                    onPress={() => router.push('/(auth)/register')}
                  >
                    <Text style={styles.guestCtaSignUpText}>Create Account</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.guestCtaLogin}
                    onPress={() => router.push('/(auth)/login')}
                  >
                    <Text style={styles.guestCtaLoginText}>Already have an account? Sign In</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* Auth Wall Modal */}
      <AuthWallModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onLogin={() => { setAuthModalVisible(false); router.push('/(auth)/login'); }}
        onRegister={() => { setAuthModalVisible(false); router.push('/(auth)/register'); }}
        actionMessage={authActionMessage}
      />
    </View>
  );
}

// ════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },

  // Loading
  loadingPulse: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(64,145,108,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  loadingSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  // ── Hero ──
  hero: {
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandName: {
    fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, fontFamily: 'Inter_800ExtraBold',
  },
  brandTagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: 2,
  },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  signInText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Location display
  locationBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  locationDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#34D399',
    shadowColor: '#34D399', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  locationLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  locationValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '600', marginTop: 1 },
  enableLocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  enableLocText: { fontSize: 12, fontWeight: '600', color: '#2D6A4F' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  // ── Search ──
  searchSection: { padding: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },

  // ── Sections ──
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  sectionSubtitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // ── Price Cards ──
  priceCard: { width: 160 },
  priceCardInner: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#1B4332', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  priceTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  priceIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  priceCommodity: {
    fontSize: 14, fontWeight: '700', color: '#1A1A2E', flex: 1,
    fontFamily: 'Inter_700Bold', lineHeight: 18,
  },
  priceValue: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  priceUnit: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 2, marginBottom: 8 },
  priceDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 8 },
  priceRange: {
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, alignSelf: 'flex-start',
  },
  priceRangeText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  priceMandiRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceMandi: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

  // ── Facility Cards ──
  facilityCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18,
    padding: 18, marginBottom: 14,
    shadowColor: '#1B4332', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  fcHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  fcIconBox: { width: 46, height: 46, borderRadius: 14, overflow: 'hidden' },
  fcIconGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  fcName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  fcLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fcLocation: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, marginLeft: 6,
  },
  distanceText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#FEF3C7',
  },
  ratingValue: { fontSize: 14, fontWeight: '800', color: '#D97706', fontFamily: 'Inter_800ExtraBold' },

  // Capacity
  capacitySection: { marginBottom: 14 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  capacityLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  capacityAvail: { fontSize: 15, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  capacityTotal: { fontSize: 12, color: '#9CA3AF' },
  gaugeCircle: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  gaugePercent: { fontSize: 11, fontWeight: '800' },
  gaugeLabel: { fontSize: 7, color: '#9CA3AF', fontWeight: '600' },
  capacityBarBg: {
    height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden',
  },
  capacityBarFill: { height: '100%', borderRadius: 3 },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  // Actions
  fcActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fcPrimaryBtn: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  fcBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 12,
  },
  fcBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  fcSecondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#D1FAE5', backgroundColor: '#F0FFF4',
  },
  fcBtnSecondaryText: { fontSize: 13, fontWeight: '600', color: '#2D6A4F' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // Guest CTA
  guestCta: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  guestCtaGradient: { padding: 24, alignItems: 'center' },
  guestCtaTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  guestCtaSubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center',
    lineHeight: 20, marginBottom: 20,
  },
  guestCtaBtns: { width: '100%', gap: 10 },
  guestCtaSignUp: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  guestCtaSignUpText: { fontSize: 15, fontWeight: '700', color: '#2D6A4F' },
  guestCtaLogin: { alignItems: 'center', paddingVertical: 8 },
  guestCtaLoginText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
});
