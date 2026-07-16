import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  FlatList,
  Animated as RNAnimated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { api } from '@/lib/api-client';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getCommodityVisual } from '@/lib/commodityImages';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UI = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  forest: '#103E34',
  forestDeep: '#082B24',
  forestMid: '#135647',
  teal: '#0D8D8A',
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  gold: '#D29424',
  goldSoft: '#FFF6E1',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  ink: '#15231D',
  muted: '#718079',
  subtle: '#96A19B',
  border: '#E2E9E3',
  danger: '#D94A4A',
  dangerSoft: '#FFF0F0',
  purple: '#7457BE',
  purpleSoft: '#F0EBFF',
};

const ACTION_GAP = 11;
const SIDE_PADDING = 16;
const ACTION_CARD_WIDTH =
  (SCREEN_WIDTH - SIDE_PADDING * 2 - ACTION_GAP * 2) / 3;

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

interface DashboardData {
  totalLots: number;
  storedWeight: number;
  totalRent: number;
  activeLots: number;
  alertLots: number;
}

const QUICK_ACTIONS = [
  {
    key: 'bookings',
    icon: 'calendar-outline',
    label: 'Bookings',
    color: '#0D7A62',
    background: '#E8F7F1',
    route: '/bookings',
  },
  {
    key: 'inventory',
    icon: 'cube-outline',
    label: 'My Lots',
    color: '#0D8D8A',
    background: '#E8F9F7',
    route: '/(tabs)/inventory',
  },
  {
    key: 'marketplace',
    icon: 'storefront-outline',
    label: 'Market',
    color: '#197C76',
    background: '#EAF8F5',
    route: '/(tabs)/marketplace',
  },
  {
    key: 'mandi',
    icon: 'trending-up-outline',
    label: 'Mandi Prices',
    color: '#D45B4E',
    background: '#FFF0EE',
    route: '/market-prices',
  },
  {
    key: 'invoices',
    icon: 'receipt-outline',
    label: 'Invoices',
    color: '#2589AA',
    background: '#EAF8FC',
    route: '/invoices',
  },
  {
    key: 'receipts',
    icon: 'document-text-outline',
    label: 'Receipts',
    color: '#7457BE',
    background: '#F0EBFF',
    route: '/receipts',
  },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [pricesMeta, setPricesMeta] = useState<{
    fetchedAt: string;
    source: string;
  } | null>(null);

  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Location state ──
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [userState, setUserState] = useState<string | null>(user?.state || null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(15)).current;
  const alertPulse = useRef(new RNAnimated.Value(1)).current;

  // ── Location Permission Check ──
  useEffect(() => {
    if (locationChecked) return;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          // Already granted — get location silently
          await fetchUserLocation();
        } else if (status === 'undetermined') {
          // First time — show popup
          setShowLocationPopup(true);
        }
        // If 'denied', don't bother user again
      } catch {
        // Location not available
      } finally {
        setLocationChecked(true);
      }
    })();
  }, []);

  const fetchUserLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setShowLocationPopup(false);
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        setUserState(address.region || null);
        setUserDistrict(address.subregion || address.district || null);
        setUserCity(address.city || address.subregion || null);
      }
      hapticSuccess();
    } catch (e) {
      console.warn('Location error:', e);
    } finally {
      setLocationLoading(false);
      setShowLocationPopup(false);
    }
  }, []);

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(alertPulse, {
          toValue: 0.55,
          duration: 1000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(alertPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [alertPulse]);

  const fetchData = useCallback(async () => {
    try {
      setError(false);

      const priceState = userState || user?.state;
      const [lotsRes, pricesRes, ordersRes, bookingsRes] = await Promise.all([
        api.get<any>('/inventory/my-lots?limit=100'),
        api.get<any>(
          `/market-prices${
            priceState ? `?state=${encodeURIComponent(priceState)}` : ''
          }`
        ),
        api
          .get<any>('/orders?limit=50')
          .catch(() => ({ success: false, data: null })),
        api
          .get<any>('/bookings/my?limit=5')
          .catch(() => ({ success: false, data: null })),
      ]);

      if (lotsRes.success && lotsRes.data?.lots) {
        const lots = lotsRes.data.lots;

        const activeLots = lots.filter(
          (lot: any) =>
            lot.status === 'STORED' ||
            lot.status === 'PARTIALLY_RELEASED'
        );

        setData({
          totalLots: lots.length,
          storedWeight: lots.reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.currentWeightKg || 0),
            0
          ),
          totalRent: lots.reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.estimatedRent || 0),
            0
          ),
          activeLots: activeLots.length,
          alertLots: 0,
        });
      }

      if (pricesRes.success && pricesRes.data) {
        setPrices(pricesRes.data);

        if (pricesRes.meta) {
          setPricesMeta(
            pricesRes.meta as {
              fetchedAt: string;
              source: string;
            }
          );
        }
      }

      if (ordersRes.success && ordersRes.data?.orders) {
        const pending = ordersRes.data.orders.filter(
          (order: any) => order.status === 'PENDING_APPROVAL'
        );

        setPendingOrdersCount(pending.length);
      }

      if (bookingsRes.success && bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }

      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        RNAnimated.timing(slideAnim, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.state, userState, fadeAnim, slideAnim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function handleNavigation(route: string) {
    hapticLight();
    router.push(route as any);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient
          colors={[UI.forestDeep, UI.forest, UI.teal]}
          style={styles.loadingHero}
        >
          <View style={styles.loadingBrandRow}>
            <View style={styles.loadingLogo}>
              <Ionicons name="leaf-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.loadingBrand}>ColdStorage</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={UI.forest} />
          <Text style={styles.loadingText}>Preparing your dashboard...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={35}
              color="#C26935"
            />
          </View>

          <Text style={styles.errorTitle}>Could not load dashboard</Text>

          <Text style={styles.errorDescription}>
            Check your connection and try again.
          </Text>

          <TouchableOpacity
            style={styles.errorRetryButton}
            activeOpacity={0.85}
            onPress={fetchData}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.errorRetryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const storedWeightMT = ((data?.storedWeight || 0) / 1000).toFixed(1);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={UI.forest}
            colors={[UI.forest]}
          />
        }
      >
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
              height: Platform.OS === 'ios' ? 56 : 38,
            }}
          />

          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleNavigation('/(tabs)/profile')}
              >
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.fullName || 'Farmer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationBtn}
                activeOpacity={0.8}
                onPress={() => handleNavigation('/notifications')}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#FFFFFF"
                />

                {unreadCount > 0 && (
                  <View style={styles.notiBadge}>
                    <Text style={styles.notiBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.heroSupportingText}>
              Your storage summary for today.
            </Text>

            <View style={styles.statStrip}>
              <DashboardStat
                icon="cube-outline"
                value={`${data?.activeLots || 0}`}
                label="LOTS"
                tint="#B9F5D5"
              />

              <View style={styles.statDivider} />

              <DashboardStat
                icon="layers-outline"
                value={storedWeightMT}
                unit=" MT"
                label="STORED"
                tint="#C6F2F1"
              />

              <View style={styles.statDivider} />

              <DashboardStat
                icon="wallet-outline"
                value={`₹${(data?.totalRent || 0).toLocaleString('en-IN')}`}
                label="RENT"
                tint="#F8D992"
                gold
              />
            </View>
          </View>
        </LinearGradient>

        <RNAnimated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {pendingOrdersCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => handleNavigation('/orders')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFF9E7', '#FFF1C5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.alertGradient}
              >
                <RNAnimated.View
                  style={[
                    styles.alertIconWrap,
                    { opacity: alertPulse },
                  ]}
                >
                  <Ionicons name="key-outline" size={20} color="#B96A10" />
                </RNAnimated.View>

                <View style={styles.alertTextWrap}>
                  <Text style={styles.alertTitle}>
                    {pendingOrdersCount} Pending Order
                    {pendingOrdersCount > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.alertSub}>
                    Review buyer requests awaiting approval.
                  </Text>
                </View>

                <View style={styles.alertArrow}>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#B96A10"
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>SHORTCUTS</Text>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionCard}
                  activeOpacity={0.76}
                  onPress={() => handleNavigation(action.route)}
                >
                  <View
                    style={[
                      styles.actionIconSquare,
                      { backgroundColor: action.background },
                    ]}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={22}
                      color={action.color}
                    />
                  </View>

                  <Text style={styles.actionLabel}>{action.label}</Text>

                  <View
                    style={[
                      styles.actionAccent,
                      { backgroundColor: action.color },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {bookings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>UPCOMING ACTIVITY</Text>

                  <View style={styles.sectionTitleRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.sectionTitleInline}>My Bookings</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => handleNavigation('/bookings')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={UI.forest}
                  />
                </TouchableOpacity>
              </View>

              {bookings.slice(0, 3).map((booking: any) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  activeOpacity={0.78}
                  onPress={() =>
                    handleNavigation(`/booking/${booking.id}`)
                  }
                >
                  <View style={styles.bookingTopRow}>
                    <View style={styles.bookingIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={UI.teal}
                      />
                    </View>

                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingNumber}>
                        #{booking.bookingNumber}
                      </Text>
                      <Text style={styles.bookingCommodity} numberOfLines={1}>
                        {booking.commodityName || 'Storage booking'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusBg(booking.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: getStatusColor(booking.status) },
                        ]}
                        numberOfLines={1}
                      >
                        {booking.status?.replace(/_/g, ' ') || 'PENDING'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingBottomRow}>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons
                        name="cube-outline"
                        size={13}
                        color={UI.subtle}
                      />
                      <Text style={styles.bookingMetaText}>
                        {Number(
                          booking.estimatedWeightKg || 0
                        ).toLocaleString('en-IN')}{' '}
                        kg
                      </Text>
                    </View>

                    <View style={styles.bookingMetaDot} />

                    <View style={styles.bookingMetaItem}>
                      <Ionicons
                        name="business-outline"
                        size={13}
                        color={UI.subtle}
                      />
                      <Text
                        style={styles.bookingMetaText}
                        numberOfLines={1}
                      >
                        {booking.facility?.name || 'Facility pending'}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={UI.subtle}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {prices.length > 0 && (
  <View style={styles.mandiSectionWrap}>
    <LinearGradient
      colors={['#F9FBF8', '#F3F7F4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.mandiSectionCard}
    >
      <View style={[styles.sectionHeader, styles.mandiHeader]}>
        <View style={styles.mandiHeaderLeft}>
          <Text style={styles.sectionEyebrow}>MARKET INTELLIGENCE</Text>

          <View style={styles.sectionTitleRow}>
            <View
              style={[
                styles.liveDot,
                pricesMeta?.source === 'fallback' && styles.liveDotFallback,
              ]}
            />
            <Text style={styles.sectionTitleInline}>Live Mandi Prices</Text>
          </View>

          {(userCity || userState || pricesMeta?.fetchedAt) && (
            <View style={styles.locationInfoRow}>
              {(userCity || userState) && (
                <View style={styles.locationChip}>
                  <Ionicons name="location" size={11} color={UI.forest} />
                  <Text style={styles.locationChipText}>
                    {userCity || userDistrict || userState}
                  </Text>
                </View>
              )}
              {pricesMeta?.fetchedAt && (
                <Text style={styles.lastUpdated}>
                  {pricesMeta.source === 'fallback' ? 'Offline · ' : ''}
                  Updated {formatTimeAgo(pricesMeta.fetchedAt)}
                </Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.mandiSeeAllButton}
          onPress={() => handleNavigation('/market-prices')}
          activeOpacity={0.82}
        >
          <Text style={styles.mandiSeeAllText}>See all</Text>
          <Ionicons name="arrow-forward" size={15} color={UI.forest} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={prices.slice(0, 8)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) =>
          item.id ? String(item.id) : `price-${index}`
        }
        contentContainerStyle={styles.mandiTickerContainer}
        renderItem={({ item }) => {
          const mandi = item.mandis?.[0];
          if (!mandi) return null;

          const minPrice = Number(mandi.minPrice || 0);
          const maxPrice = Number(mandi.maxPrice || 0);
          const modalPrice = Number(mandi.modalPrice || 0);
          const midpoint = (minPrice + maxPrice) / 2;
          const isUp = modalPrice >= midpoint;
          const cleanUnit = item.unit ? item.unit.replace('₹/', '') : 'Quintal';
          const visual = getCommodityVisual(item.commodity || '');

          return (
            <TouchableOpacity
              style={styles.premiumTickerCard}
              activeOpacity={0.85}
              onPress={() => handleNavigation('/market-prices')}
            >
              {/* Commodity Emoji Header */}
              <View style={[styles.commodityImageArea, { backgroundColor: visual.bg }]}>
                <Text style={styles.commodityEmoji}>{visual.emoji}</Text>
                <View
                  style={[
                    styles.trendBadgeOverlay,
                    {
                      backgroundColor: isUp
                        ? 'rgba(23,165,109,0.15)'
                        : 'rgba(217,74,74,0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={isUp ? 'trending-up' : 'trending-down'}
                    size={13}
                    color={isUp ? '#059669' : '#DC2626'}
                  />
                </View>
              </View>

              {/* Info */}
              <View style={styles.commodityCardBody}>
                <Text style={styles.premiumTickerCommodity} numberOfLines={1}>
                  {item.commodity}
                </Text>

                <View style={styles.commodityLocationRow}>
                  <Ionicons name="location-outline" size={10} color={UI.subtle} />
                  <Text style={styles.commodityLocationText} numberOfLines={1}>
                    {mandi.name || 'Mandi'}
                    {mandi.district ? `, ${mandi.district}` : ''}
                  </Text>
                </View>

                <View style={styles.commodityPriceRow}>
                  <Text style={[styles.premiumTickerPrice, { color: visual.accent }]}>
                    ₹{modalPrice.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.premiumTickerUnit}>/{cleanUnit}</Text>
                </View>

                <View style={styles.commodityRangeRow}>
                  <Text style={styles.rangeMinMax}>
                    ₹{minPrice.toLocaleString('en-IN')} – ₹{maxPrice.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </LinearGradient>
  </View>
)}

          {data && data.totalLots === 0 && bookings.length === 0 && (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={['#E4F5EE', '#E7F8F7']}
                style={styles.emptyIconWrap}
              >
                <Ionicons name="leaf-outline" size={37} color={UI.forest} />
              </LinearGradient>

              <Text style={styles.emptyTitle}>Welcome to ColdStorage</Text>

              <Text style={styles.emptySub}>
                Find verified cold storage close to you and reserve space for
                your produce.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.85}
                onPress={() => handleNavigation('/(tabs)/discover')}
              >
                <Ionicons name="compass-outline" size={19} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Find Nearby Storage</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Platform.OS === 'ios' ? 112 : 90 }} />
        </RNAnimated.View>
      </ScrollView>

      {/* ── Location Permission Popup ── */}
      <Modal
        visible={showLocationPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPopup(false)}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalCard}>
            <View style={styles.locationModalHandle} />

            <View style={styles.locationModalIconWrap}>
              <Ionicons name="location" size={28} color={UI.forest} />
            </View>

            <Text style={styles.locationModalTitle}>
              Enable Location
            </Text>
            <Text style={styles.locationModalDesc}>
              Allow ColdStorage to access your location to show nearby mandi prices, cold storage facilities, and market rates from your area.
            </Text>

            <TouchableOpacity
              style={styles.locationModalPrimaryBtn}
              onPress={fetchUserLocation}
              activeOpacity={0.85}
              disabled={locationLoading}
            >
              <LinearGradient
                colors={[UI.forestDeep, UI.forest] as any}
                style={styles.locationModalBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {locationLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={16} color="#FFF" />
                    <Text style={styles.locationModalBtnText}>Allow Location</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationModalSkipBtn}
              onPress={() => setShowLocationPopup(false)}
            >
              <Text style={styles.locationModalSkipText}>
                Skip — Show all India prices
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DashboardStat({
  icon,
  value,
  unit,
  label,
  tint,
  gold = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  unit?: string;
  label: string;
  tint: string;
  gold?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statIconRow}>
        <Ionicons name={icon} size={13} color={tint} />
        <Text style={[styles.statLabel, { color: tint }]}>{label}</Text>
      </View>

      <Text style={[styles.statValue, gold && styles.statValueGold]}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#92400E',
    CONFIRMED: '#1E40AF',
    ARRIVED: '#5B21B6',
    WEIGHING: '#4338CA',
    STORED: '#065F46',
    DISPATCH_REQUESTED: '#9A3412',
    DISPATCHING: '#9D174D',
    DISPATCHED: '#155E75',
    COMPLETED: '#065F46',
    CANCELLED: '#991B1B',
    REJECTED: '#991B1B',
  };

  return map[status] || '#4B5563';
}

function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#FEF3C7',
    CONFIRMED: '#DBEAFE',
    ARRIVED: '#EDE9FE',
    WEIGHING: '#E0E7FF',
    STORED: '#D1FAE5',
    DISPATCH_REQUESTED: '#FFEDD5',
    DISPATCHING: '#FCE7F3',
    DISPATCHED: '#CFFAFE',
    COMPLETED: '#D1FAE5',
    CANCELLED: '#FECACA',
    REJECTED: '#FECACA',
  };

  return map[status] || '#F3F4F6';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  container: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  scrollContent: {
    paddingBottom: 18,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  loadingHero: {
    height: 255,
    paddingTop: Platform.OS === 'ios' ? 67 : 42,
    paddingHorizontal: 20,
  },

  loadingBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingLogo: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  loadingBrand: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },

  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 14,
    color: UI.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  errorScreen: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.canvas,
  },

  errorCard: {
    width: '100%',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },

  errorIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2E8',
  },

  errorTitle: {
    marginTop: 17,
    color: UI.ink,
    fontSize: 20,
    fontWeight: '800',
  },

  errorDescription: {
    marginTop: 8,
    color: UI.muted,
    fontSize: 14,
    textAlign: 'center',
  },

  errorRetryButton: {
    marginTop: 22,
    minHeight: 50,
    paddingHorizontal: 19,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.forest,
  },

  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  hero: {
    paddingBottom: 26,
    overflow: 'hidden',
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
  },

  heroGlowTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    top: -110,
    right: -85,
    borderRadius: 120,
    backgroundColor: 'rgba(44, 207, 171, 0.16)',
  },

  heroGlowBottom: {
    position: 'absolute',
    width: 290,
    height: 190,
    bottom: -125,
    left: -105,
    borderRadius: 145,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  heroContent: {
    paddingHorizontal: SIDE_PADDING,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  greeting: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 14,
    fontWeight: '500',
  },

  userName: {
    maxWidth: SCREEN_WIDTH - 120,
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.65,
  },

  heroSupportingText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
  },

  notificationBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
  },

  notiBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5484D',
    borderWidth: 2,
    borderColor: UI.forest,
  },

  notiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  statStrip: {
    marginTop: 22,
    minHeight: 86,
    paddingHorizontal: 7,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  statValue: {
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },

  statValueGold: {
    color: '#F8D992',
    fontSize: 18,
  },

  statUnit: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '700',
  },

  statDivider: {
    width: 1,
    height: 41,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  alertBanner: {
    marginHorizontal: SIDE_PADDING,
    marginTop: 17,
    borderRadius: 19,
    overflow: 'hidden',
    shadowColor: '#C99424',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
  },

  alertGradient: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#F6DD97',
  },

  alertIconWrap: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  alertTextWrap: {
    flex: 1,
  },

  alertTitle: {
    color: '#804D0E',
    fontSize: 15,
    fontWeight: '800',
  },

  alertSub: {
    marginTop: 3,
    color: '#A66C21',
    fontSize: 12,
  },

  alertArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,119,6,0.1)',
  },

  section: {
    marginTop: 26,
    paddingHorizontal: SIDE_PADDING,
  },

  

  sectionHeader: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionEyebrow: {
    color: UI.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  sectionTitle: {
    marginTop: 4,
    color: UI.ink,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  sectionTitleRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitleInline: {
    color: UI.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  seeAllButton: {
    paddingLeft: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  seeAllText: {
    color: UI.forest,
    fontSize: 12,
    fontWeight: '800',
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.emerald,
  },

  liveDotFallback: {
    backgroundColor: UI.gold,
  },

  lastUpdated: {
    marginTop: 4,
    marginLeft: 16,
    color: UI.subtle,
    fontSize: 10,
    fontWeight: '600',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ACTION_GAP,
  },

  actionCard: {
    width: ACTION_CARD_WIDTH,
    height: 121,
    paddingTop: 17,
    borderRadius: 20,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  actionIconSquare: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionLabel: {
    marginTop: 10,
    paddingHorizontal: 5,
    color: UI.ink,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  actionAccent: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 3,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.85,
  },

  bookingCard: {
    marginBottom: 11,
    padding: 14,
    borderRadius: 20,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bookingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.tealSoft,
  },

  bookingInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  bookingNumber: {
    color: UI.subtle,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  bookingCommodity: {
    marginTop: 3,
    color: UI.ink,
    fontSize: 15,
    fontWeight: '800',
  },

  statusChip: {
    maxWidth: 109,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusChipText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },

  bookingBottomRow: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  bookingMetaItem: {
    maxWidth: '43%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  bookingMetaText: {
    color: UI.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  bookingMetaDot: {
    width: 3,
    height: 3,
    marginHorizontal: 2,
    borderRadius: 3,
    backgroundColor: '#C7D1CA',
  },

  



  emptyCard: {
    marginHorizontal: SIDE_PADDING,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 31,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },

  emptyIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 19,
    color: UI.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  emptySub: {
    marginTop: 8,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: 53,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.forest,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

emptyButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '800',
},

mandiSectionWrap: {
  marginTop: 30,
  paddingHorizontal: 16,
},

mandiSectionCard: {
  paddingTop: 18,
  paddingBottom: 18,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: '#E4ECE5',
  backgroundColor: '#F8FAF7',
},

mandiHeader: {
  paddingHorizontal: SIDE_PADDING,
  marginBottom: 16,
  alignItems: 'flex-start',
},

mandiHeaderLeft: {
  flex: 1,
  paddingRight: 10,
},

mandiSeeAllButton: {
  minHeight: 38,
  paddingLeft: 12,
  paddingRight: 10,
  borderRadius: 999,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E3EAE4',
},

mandiSeeAllText: {
  color: UI.forest,
  fontSize: 12,
  fontWeight: '800',
},

mandiTickerContainer: {
  paddingLeft: 16,
  paddingRight: 6,
},

premiumTickerCard: {
  width: 195,
  marginRight: 12,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E4EAE4',
  shadowColor: '#173D31',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 3,
  overflow: 'hidden',
},

commodityImageArea: {
  height: 90,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},

commodityEmoji: {
  fontSize: 42,
},

trendBadgeOverlay: {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 28,
  height: 28,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
},

commodityCardBody: {
  padding: 13,
},

premiumTickerCommodity: {
  color: UI.ink,
  fontSize: 15,
  fontWeight: '800',
  letterSpacing: -0.2,
},

commodityLocationRow: {
  marginTop: 4,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
},

commodityLocationText: {
  flex: 1,
  color: UI.subtle,
  fontSize: 10,
  fontWeight: '600',
},

commodityPriceRow: {
  marginTop: 10,
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: 2,
},

premiumTickerPrice: {
  color: UI.forest,
  fontSize: 22,
  fontWeight: '900',
  letterSpacing: -0.55,
},

premiumTickerUnit: {
  color: UI.subtle,
  fontSize: 11,
  fontWeight: '700',
},

commodityRangeRow: {
  marginTop: 4,
},

rangeMinMax: {
  color: UI.muted,
  fontSize: 11,
  fontWeight: '600',
},

locationInfoRow: {
  marginTop: 4,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
},

locationChip: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingVertical: 3,
  paddingHorizontal: 8,
  borderRadius: 8,
  backgroundColor: 'rgba(27, 94, 74, 0.08)',
},

locationChipText: {
  color: UI.forest,
  fontSize: 11,
  fontWeight: '700',
},

// ── Location Modal ──
locationModalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0,0,0,0.45)',
},

locationModalCard: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  paddingHorizontal: 24,
  paddingTop: 12,
  paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  alignItems: 'center',
},

locationModalHandle: {
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: '#D4D8D4',
  marginBottom: 20,
},

locationModalIconWrap: {
  width: 60,
  height: 60,
  borderRadius: 18,
  backgroundColor: 'rgba(27, 94, 74, 0.08)',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
},

locationModalTitle: {
  fontSize: 22,
  fontWeight: '800',
  color: '#1A1A2E',
  letterSpacing: -0.3,
  marginBottom: 8,
},

locationModalDesc: {
  fontSize: 14,
  color: '#5F6B7A',
  lineHeight: 21,
  textAlign: 'center',
  marginBottom: 24,
  paddingHorizontal: 8,
},

locationModalPrimaryBtn: {
  width: '100%',
  borderRadius: 14,
  overflow: 'hidden',
  marginBottom: 10,
},

locationModalBtnGrad: {
  paddingVertical: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: 14,
},

locationModalBtnText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FFFFFF',
},

locationModalSkipBtn: {
  paddingVertical: 12,
},

locationModalSkipText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#94A3B8',
},
});
