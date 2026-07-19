import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import AuthWallModal from '@/components/AuthWallModal';

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
  phoneNumber?: string;
  commodities?: string[];
  operatingSince?: string;
  status?: string;
  chambers?: {
    id: string;
    chamberNumber: string;
    name?: string;
    targetTempMin?: number;
    targetTempMax?: number;
    commodityCategory?: string;
  }[];
}

interface MarketPrice {
  commodity: string;
  category: string;
  unit: string;
  imageUrl?: string;
  image?: string;
  commodityImage?: string;
  iconUrl?: string;
  photo?: string;
  mandis: {
    name: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
  }[];
}

type LanguageKey = 'hi' | 'en';

const UI = {
  bg: '#F3F6F2',
  surface: '#FFFFFF',
  surfaceWarm: '#FBFCF9',
  border: '#E1E9E2',
  text: '#173526',
  textMuted: '#66776C',
  textSoft: '#98A69D',

  forest: '#173F2D',
  forestDark: '#102D20',
  forestSoft: '#E7F2E9',
  forestSoftStrong: '#D9EDDE',

  gold: '#D9A441',
  goldSoft: '#FFF4D9',

  blueSoft: '#E9F2FF',
  blue: '#3976C7',

  danger: '#C5534C',
  dangerSoft: '#FFF0EE',

  warning: '#A87312',
  warningSoft: '#FFF5DD',

  white: '#FFFFFF',
};

const COPY = {
  hi: {
    appName: 'शीतकोष',
    trusted: 'विश्वसनीय कोल्ड स्टोरेज नेटवर्क',
    homeSub: 'सही स्टोरेज और आज का मंडी भाव',
    signIn: 'लॉगिन',
    yourPlace: 'आपकी जगह',
    noLocation: 'लोकेशन बंद है',
    allIndia: 'पूरे भारत के स्टोरेज दिख रहे हैं',
    enable: 'चालू करें',
    nearbyStorage: 'नज़दीकी स्टोरेज',
    seeAll: 'सभी देखें',
    todayPrices: 'आज का भाव',
    updatedToday: 'आज अपडेट',
    emptyFacilities: 'कोई स्टोरेज नहीं मिला',
    emptyFacilitiesSub: 'थोड़ा बाद में फिर देखें',
    emptyPrices: 'आज भाव उपलब्ध नहीं है',
    emptyPricesSub: 'बाद में फिर देखें',
    away: 'दूरी',
    km: 'किमी',
    spaceAvailable: 'जगह उपलब्ध',
    almostFull: 'जगह कम है',
    full: 'पूरा भरा',
    bookNow: 'बुक करें',
    perUnit: 'प्रति',
    language: 'भाषा',
    needLoginBook: 'बुकिंग के लिए किसान के रूप में लॉगिन करें।',
    needLoginDetails: 'पूरी जानकारी देखने के लिए लॉगिन करें।',
    getStarted: 'शुरू करें',
    createAccount: 'खाता बनाएं',
    alreadyAccount: 'पहले से खाता है? लॉगिन करें',
    storageNearYou: 'नज़दीकी स्टोरेज',
    liveCapacity: 'लाइव क्षमता',
    verified: 'सत्यापित',
    mandiRate: 'मंडी भाव',
    mtAvailable: 'MT उपलब्ध',
    mtTotal: 'MT कुल',
    produce: 'उत्पाद',
    accountEyebrow: 'शीतकोष खाता',
    accountSub: 'अपनी बुकिंग सेव करें और स्टोरेज एक जगह मैनेज करें।',
  },
  en: {
    appName: 'SheetKosh',
    trusted: 'TRUSTED COLD STORAGE NETWORK',
    homeSub: 'Better storage and today’s mandi prices',
    signIn: 'Sign in',
    yourPlace: 'Your location',
    noLocation: 'Location is off',
    allIndia: 'Showing storage across India',
    enable: 'Enable',
    nearbyStorage: 'Nearby storage',
    seeAll: 'See all',
    todayPrices: 'Today’s prices',
    updatedToday: 'Updated today',
    emptyFacilities: 'No storage found',
    emptyFacilitiesSub: 'Please try again later',
    emptyPrices: 'No prices today',
    emptyPricesSub: 'Please check again later',
    away: 'Distance',
    km: 'km',
    spaceAvailable: 'Space available',
    almostFull: 'Almost full',
    full: 'Full',
    bookNow: 'Book storage',
    perUnit: 'per',
    language: 'Language',
    needLoginBook: 'Sign in as a farmer to book storage.',
    needLoginDetails: 'Sign in to view full details.',
    getStarted: 'Get started',
    createAccount: 'Create account',
    alreadyAccount: 'Already have an account? Sign in',
    storageNearYou: 'Storage near you',
    liveCapacity: 'LIVE CAPACITY',
    verified: 'Verified',
    mandiRate: 'MANDI PRICE',
    mtAvailable: 'MT available',
    mtTotal: 'MT total',
    produce: 'Produce',
    accountEyebrow: 'SHEETKOSH ACCOUNT',
    accountSub: 'Save your bookings and manage your storage in one place.',
  },
} as const;

function getSpaceStatus(
  available: number,
  total: number,
  t: typeof COPY.hi | typeof COPY.en
) {
  if (!total || total <= 0) {
    return {
      label: t.spaceAvailable,
      bg: UI.forestSoft,
      color: UI.forest,
      icon: 'checkmark-circle' as const,
    };
  }

  const freeRatio = available / total;

  if (freeRatio <= 0.05) {
    return {
      label: t.full,
      bg: UI.dangerSoft,
      color: UI.danger,
      icon: 'close-circle' as const,
    };
  }

  if (freeRatio <= 0.2) {
    return {
      label: t.almostFull,
      bg: UI.warningSoft,
      color: UI.warning,
      icon: 'alert-circle' as const,
    };
  }

  return {
    label: t.spaceAvailable,
    bg: UI.forestSoft,
    color: UI.forest,
    icon: 'checkmark-circle' as const,
  };
}

function getCommodityVisualMeta(name: string) {
  const n = (name || '').toLowerCase();

  if (n.includes('potato') || n.includes('aaloo') || n.includes('आलू')) {
    return {
      bg: '#F5E8D4',
      fallbackUrl:
        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('onion') || n.includes('प्याज') || n.includes('प्याज़')) {
    return {
      bg: '#F7E4E5',
      fallbackUrl:
        'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('tomato') || n.includes('टमाटर')) {
    return {
      bg: '#F9E2DE',
      fallbackUrl:
        'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('apple') || n.includes('सेब')) {
    return {
      bg: '#F6E2E5',
      fallbackUrl:
        'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('amla') || n.includes('nelli')) {
    return {
      bg: '#E6F0E1',
      fallbackUrl:
        'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('banana') || n.includes('केला')) {
    return {
      bg: '#FBF1CF',
      fallbackUrl:
        'https://images.unsplash.com/photo-1574226516831-e1dff420e37f?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('grape') || n.includes('अंगूर')) {
    return {
      bg: '#EEE5F6',
      fallbackUrl:
        'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('mango') || n.includes('आम')) {
    return {
      bg: '#FFE7CF',
      fallbackUrl:
        'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('orange') || n.includes('संतरा')) {
    return {
      bg: '#FFE7D8',
      fallbackUrl:
        'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (n.includes('lemon') || n.includes('नींबू')) {
    return {
      bg: '#FCF6D7',
      fallbackUrl:
        'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=700&q=85',
    };
  }

  if (
    n.includes('chilli') ||
    n.includes('mirchi') ||
    n.includes('मिर्च')
  ) {
    return {
      bg: '#FBE4DB',
      fallbackUrl:
        'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=700&q=85',
    };
  }

  return {
    bg: '#EDF1E5',
    fallbackUrl: `https://source.unsplash.com/700x500/?${encodeURIComponent(
      name || 'fresh vegetables'
    )}`,
  };
}

function getCommodityImageUri(price: MarketPrice) {
  const apiImage =
    price.imageUrl ||
    price.image ||
    price.commodityImage ||
    price.iconUrl ||
    price.photo;

  if (apiImage && typeof apiImage === 'string' && apiImage.trim()) {
    return apiImage.trim();
  }

  return getCommodityVisualMeta(price.commodity).fallbackUrl;
}

function PriceImage({
  uri,
  commodity,
  cardKey,
  brokenMap,
  setBrokenMap,
}: {
  uri: string;
  commodity: string;
  cardKey: string;
  brokenMap: Record<string, boolean>;
  setBrokenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const hasBrokenImage = brokenMap[cardKey];

  if (hasBrokenImage) {
    return (
      <View style={styles.priceImageFallback}>
        <Ionicons name="leaf-outline" size={25} color={UI.forest} />
        <Text style={styles.priceImageFallbackText} numberOfLines={1}>
          {commodity}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.priceImage}
      resizeMode="cover"
      onError={() =>
        setBrokenMap((previous) => ({
          ...previous,
          [cardKey]: true,
        }))
      }
    />
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [uiState, setUiState] = useState<
    'loading' | 'loaded' | 'denied'
  >('loading');

  const [language, setLanguage] = useState<LanguageKey>('en');
  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [locationAddress, setLocationAddress] = useState('');
  const [locationState, setLocationState] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState('');

  const [brokenPriceImages, setBrokenPriceImages] = useState<
    Record<string, boolean>
  >({});

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(22)).current;

  const t = COPY[language];

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(contentSlide, {
        toValue: 0,
        tension: 52,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchAllData = useCallback(async (lat?: number, lng?: number, state?: string) => {
    try {
      const priceQuery = state
        ? `/market-prices?state=${encodeURIComponent(state)}`
        : '/market-prices';

      const [facilitiesRes, pricesRes] = await Promise.all([
        api.get<any>(
          `/discover/facilities?limit=50${
            lat ? `&latitude=${lat}&longitude=${lng}` : ''
          }`
        ),
        api.get<any>(priceQuery),
      ]);

      if (facilitiesRes.success && facilitiesRes.data) {
        const rawFacilities = Array.isArray(facilitiesRes.data)
          ? facilitiesRes.data
          : facilitiesRes.data.facilities || [];

        const activeFacilities = rawFacilities
          .filter((facility: any) => facility.status === 'ACTIVE')
          .map((facility: any) => ({
            ...facility,
            totalCapacity: Number(
              facility.totalCapacity ?? facility.totalCapacityMt ?? 0
            ),
            availableCapacity: Number(facility.availableCapacity ?? 0),
            avgRating:
              Number(facility.avgRating ?? facility.averageRating ?? 0) ||
              undefined,
            reviewCount:
              Number(facility.reviewCount ?? facility._count?.reviews ?? 0) ||
              undefined,
          }));

        setFacilities(activeFacilities);
      }

      if (pricesRes.success && pricesRes.data) {
        setMarketPrices(
          Array.isArray(pricesRes.data) ? pricesRes.data : []
        );
      }
    } catch (error) {
      console.error('Discover fetch error:', error);
    }
  }, []);

  // Auto-request location on mount (like other apps — just a system popup)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setLocation(currentLocation);

          let userState = '';
          try {
            const [address] = await Location.reverseGeocodeAsync({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });

            if (address) {
              const parts = [
                address.subregion || address.city || address.district,
                address.region,
              ].filter(Boolean);
              setLocationAddress(parts.join(', '));
              userState = address.region || '';
              setLocationState(userState);
            }
          } catch {
            setLocationAddress(
              `${currentLocation.coords.latitude.toFixed(4)}°N, ${currentLocation.coords.longitude.toFixed(4)}°E`
            );
          }

          await fetchAllData(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            userState
          );
          setUiState('loaded');
        } else {
          // Permission denied — still load data without location
          await fetchAllData();
          setUiState('denied');
        }
      } catch {
        await fetchAllData();
        setUiState('denied');
      }

      animateIn();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocation = async () => {
    setUiState('loading');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation(currentLocation);

        let userState = '';
        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });

          if (address) {
            const parts = [
              address.subregion || address.city || address.district,
              address.region,
            ].filter(Boolean);
            setLocationAddress(parts.join(', '));
            userState = address.region || '';
            setLocationState(userState);
          }
        } catch {
          // ignore reverse geocode failure
        }

        await fetchAllData(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          userState
        );
        setUiState('loaded');
      } else {
        setUiState('denied');
        await fetchAllData();
      }
    } catch {
      setUiState('denied');
      await fetchAllData();
    }

    animateIn();
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (location) {
      await fetchAllData(
        location.coords.latitude,
        location.coords.longitude,
        locationState
      );
    } else {
      await fetchAllData();
    }

    setRefreshing(false);
  };

  const handleGatedAction = (actionType: 'book' | 'details') => {
    const messages: Record<'book' | 'details', string> = {
      book: t.needLoginBook,
      details: t.needLoginDetails,
    };

    setAuthActionMessage(messages[actionType]);
    setAuthModalVisible(true);
  };

  const visibleFacilities = useMemo(() => {
    return [...facilities]
      .sort((a, b) => {
        const aDistance = Number(a.distanceKm ?? 999999);
        const bDistance = Number(b.distanceKm ?? 999999);

        return aDistance - bDistance;
      })
      .slice(0, 6);
  }, [facilities]);

  const visiblePrices = useMemo(() => {
    return marketPrices
      .filter((item) => item?.commodity && item?.mandis?.length)
      .slice(0, 8);
  }, [marketPrices]);

  // No more full-screen location primer — location popup is shown on mount

  if (uiState === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.center}>
          <StatusBar
            barStyle="light-content"
            translucent
            backgroundColor="transparent"
          />

          <View style={styles.loadingMark}>
            <View style={styles.loadingInner}>
              <Ionicons name="snow-outline" size={28} color={UI.gold} />
            </View>
          </View>

          <ActivityIndicator
            size="small"
            color={UI.gold}
            style={{ marginBottom: 17 }}
          />

          <Text style={styles.loadingTitle}>SheetKosh</Text>
          <Text style={styles.loadingSub}>{t.homeSub}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI.forest}
            />
          }
        >
          {/* ───────────── PREMIUM HERO ───────────── */}
          <Animated.View style={{ opacity: headerFade }}>
            <View style={styles.hero}>
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />
              <View style={styles.heroPattern} />

              <View style={styles.heroTopRow}>
                <View style={styles.brandRow}>
                  <View style={styles.brandMark}>
                    <Ionicons
                      name="snow-outline"
                      size={22}
                      color={UI.gold}
                    />
                  </View>

                  <View>
                    <Text style={styles.brandMiniText}>
                      {t.trusted}
                    </Text>

                    <Text style={styles.brandName}>
                      {language === 'hi' ? 'शीतकोष' : 'SheetKosh'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="person-outline" size={18} color="#F9FCF9" />
                  <Text style={styles.loginButtonText}>{t.signIn}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroMainContent}>
                <Text style={styles.heroHeading}>{t.storageNearYou}</Text>

                <Text style={styles.heroSubheading}>{t.homeSub}</Text>
              </View>

              <View style={styles.heroUtilityRow}>
                <TouchableOpacity
                  style={styles.locationPill}
                  activeOpacity={0.85}
                  onPress={!location ? requestLocation : undefined}
                >
                  <View style={styles.locationIcon}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={UI.gold}
                    />
                  </View>

                  <View style={styles.locationTextWrap}>
                    <Text style={styles.locationPillLabel}>
                      {location ? t.yourPlace : t.noLocation}
                    </Text>

                    <Text style={styles.locationPillValue} numberOfLines={1}>
                      {location
                        ? locationAddress ||
                          `${location.coords.latitude.toFixed(
                            4
                          )}°N, ${location.coords.longitude.toFixed(4)}°E`
                        : t.allIndia}
                    </Text>
                  </View>

                  {!location && (
                    <View style={styles.enablePill}>
                      <Text style={styles.enablePillText}>{t.enable}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.languageToggle}>
                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      language === 'hi' && styles.languageButtonActive,
                    ]}
                    onPress={() => setLanguage('hi')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        language === 'hi' &&
                          styles.languageButtonTextActive,
                      ]}
                    >
                      हि
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      language === 'en' && styles.languageButtonActive,
                    ]}
                    onPress={() => setLanguage('en')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        language === 'en' &&
                          styles.languageButtonTextActive,
                      ]}
                    >
                      EN
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={{
              transform: [{ translateY: contentSlide }],
            }}
          >
            {/* ───────────── STORAGE ───────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View>
                  <View style={styles.sectionEyebrowRow}>
                    <Ionicons
                      name="snow-outline"
                      size={14}
                      color={UI.gold}
                    />
                    <Text style={styles.sectionEyebrow}>
                      {t.liveCapacity}
                    </Text>
                  </View>

                  <Text style={styles.sectionTitle}>{t.nearbyStorage}</Text>
                </View>

                {visibleFacilities.length > 0 && (
                  <TouchableOpacity
                    style={styles.seeAllButton}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.seeAllText}>{t.seeAll}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color={UI.forest}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {visibleFacilities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons
                      name="search-outline"
                      size={25}
                      color={UI.forest}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>{t.emptyFacilities}</Text>
                  <Text style={styles.emptySub}>
                    {t.emptyFacilitiesSub}
                  </Text>
                </View>
              ) : (
                visibleFacilities.map((facility) => {
                  const spaceStatus = getSpaceStatus(
                    Number(facility.availableCapacity || 0),
                    Number(facility.totalCapacity || 0),
                    t
                  );

                  const available = Number(facility.availableCapacity || 0);
                  const total = Number(facility.totalCapacity || 0);

                  const capacityPercentage =
                    total > 0
                      ? Math.max(
                          0,
                          Math.min(100, (available / total) * 100)
                        )
                      : 0;

                  const distanceText =
                    facility.distanceKm !== undefined &&
                    facility.distanceKm !== null
                      ? `${Number(facility.distanceKm).toFixed(1)} ${t.km}`
                      : '—';

                  return (
                    <TouchableOpacity
                      key={facility.id}
                      style={styles.facilityCard}
                      activeOpacity={0.93}
                      onPress={() => {
                        if (isAuthenticated) {
                          router.push(`/facility/${facility.id}`);
                        } else {
                          handleGatedAction('details');
                        }
                      }}
                    >
                      <View style={styles.facilityTopRow}>
                        <View style={styles.facilityIconBox}>
                          <Ionicons
                            name="business-outline"
                            size={22}
                            color={UI.forest}
                          />
                        </View>

                        <View style={styles.facilityTitleWrap}>
                          <View style={styles.facilityNameRow}>
                            <Text
                              style={styles.facilityName}
                              numberOfLines={1}
                            >
                              {facility.name}
                            </Text>

                            <View style={styles.verifiedBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={13}
                                color={UI.forest}
                              />
                              <Text style={styles.verifiedText}>
                                {t.verified}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={styles.facilityLocation}
                            numberOfLines={1}
                          >
                            {facility.city}, {facility.state}
                          </Text>
                        </View>

                        <View style={styles.distanceBox}>
                          <Ionicons
                            name="navigate-outline"
                            size={14}
                            color={UI.forest}
                          />
                          <Text style={styles.distanceText}>
                            {distanceText}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.facilityDivider} />

                      <View style={styles.capacityRow}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.capacityTextRow}>
                            <Text style={styles.capacityLabel}>
                              {spaceStatus.label}
                            </Text>

                            <Text style={styles.capacityAmount}>
                              {available.toLocaleString('en-IN')} MT
                            </Text>
                          </View>

                          <View style={styles.capacityTrack}>
                            <View
                              style={[
                                styles.capacityFill,
                                {
                                  width: `${capacityPercentage}%`,
                                  backgroundColor: spaceStatus.color,
                                },
                              ]}
                            />
                          </View>

                          <Text style={styles.capacityFootnote}>
                            {available.toLocaleString('en-IN')} {t.mtAvailable}
                            {' · '}
                            {total.toLocaleString('en-IN')} {t.mtTotal}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.spaceStatusPill,
                            { backgroundColor: spaceStatus.bg },
                          ]}
                        >
                          <Ionicons
                            name={spaceStatus.icon}
                            size={15}
                            color={spaceStatus.color}
                          />
                        </View>
                      </View>

                      <View style={styles.facilityBottomRow}>
                        <View style={styles.commodityTag}>
                          <Ionicons
                            name="leaf-outline"
                            size={14}
                            color={UI.textMuted}
                          />

                          <Text
                            style={styles.commodityTagText}
                            numberOfLines={1}
                          >
                            {facility.commodities?.[0] ||
                              facility.storageType ||
                              'Cold storage'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.bookButton}
                          activeOpacity={0.87}
                          onPress={() => {
                            if (isAuthenticated) {
                              router.push(`/facility/${facility.id}`);
                            } else {
                              handleGatedAction('book');
                            }
                          }}
                        >
                          <Text style={styles.bookButtonText}>
                            {t.bookNow}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={15}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* ───────────── MANDI PRICES ───────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View>
                  <View style={styles.sectionEyebrowRow}>
                    <Ionicons
                      name="trending-up-outline"
                      size={14}
                      color={UI.gold}
                    />
                    <Text style={styles.sectionEyebrow}>{t.mandiRate}</Text>
                  </View>

                  <Text style={styles.sectionTitle}>{t.todayPrices}</Text>
                </View>

                <View style={styles.updatedBadge}>
                  <View style={styles.updatedDot} />
                  <Text style={styles.updatedText}>{t.updatedToday}</Text>
                </View>
              </View>

              {visiblePrices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons
                      name="bar-chart-outline"
                      size={25}
                      color={UI.forest}
                    />
                  </View>

                  <Text style={styles.emptyTitle}>{t.emptyPrices}</Text>
                  <Text style={styles.emptySub}>{t.emptyPricesSub}</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.priceScroll}
                >
                  {visiblePrices.map((price, index) => {
                    const mandi = price.mandis?.[0];

                    if (!mandi) {
                      return null;
                    }

                    const imageUri = getCommodityImageUri(price);
                    const cardKey = `${price.commodity}-${index}-${mandi.name}`;

                    return (
                      <TouchableOpacity
                        key={cardKey}
                        style={styles.priceCard}
                        activeOpacity={0.92}
                      >
                        <View style={styles.priceImageWrap}>
                          <PriceImage
                            uri={imageUri}
                            commodity={price.commodity}
                            cardKey={cardKey}
                            brokenMap={brokenPriceImages}
                            setBrokenMap={setBrokenPriceImages}
                          />

                          <View style={styles.priceImageShade} />

                          <View style={styles.priceCategoryBadge}>
                            <Ionicons
                              name="leaf-outline"
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.priceCategoryText}>
                              {price.category || t.produce}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.priceContent}>
                          <Text
                            style={styles.priceCommodityName}
                            numberOfLines={1}
                          >
                            {price.commodity}
                          </Text>

                          <View style={styles.priceMandiRow}>
                            <Ionicons
                              name="location-outline"
                              size={13}
                              color={UI.textSoft}
                            />
                            <Text
                              style={styles.priceMandiText}
                              numberOfLines={1}
                            >
                              {mandi.name}
                            </Text>
                          </View>

                          <View style={styles.priceFooter}>
                            <View>
                              <Text style={styles.priceUnitText}>
                                {t.perUnit} ₹/{price.unit}
                              </Text>

                              <Text style={styles.priceValue}>
                                ₹
                                {Number(
                                  mandi.modalPrice || 0
                                ).toLocaleString('en-IN')}
                              </Text>
                            </View>

                            <View style={styles.priceArrowButton}>
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={UI.forest}
                              />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ───────────── GUEST CTA ───────────── */}
            {!isAuthenticated && (
              <View style={styles.guestSection}>
                <View style={styles.guestCard}>
                  <View style={styles.guestGlowOne} />
                  <View style={styles.guestGlowTwo} />

                  <View style={styles.guestIcon}>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color={UI.gold}
                    />
                  </View>

                  <View style={styles.guestContent}>
                    <Text style={styles.guestEyebrow}>
                      {t.accountEyebrow}
                    </Text>

                    <Text style={styles.guestTitle}>{t.getStarted}</Text>

                    <Text style={styles.guestSub}>
                      {t.accountSub}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.guestPrimaryButton}
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.guestPrimaryText}>
                      {t.createAccount}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={UI.forestDark}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.guestLoginButton}
                    onPress={() => router.push('/(auth)/login')}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.guestLoginText}>
                      {t.alreadyAccount}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 34 }} />
          </Animated.View>
        </ScrollView>

        <AuthWallModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onLogin={() => {
            setAuthModalVisible(false);
            router.push('/(auth)/login');
          }}
          onRegister={() => {
            setAuthModalVisible(false);
            router.push('/(auth)/register');
          }}
          actionMessage={authActionMessage}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  scrollContent: {
    paddingBottom: 18,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: UI.forestDark,
  },

  loadingMark: {
    width: 86,
    height: 86,
    marginBottom: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  loadingInner: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(217,164,65,0.14)',
  },

  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  loadingSub: {
    marginTop: 8,
    color: '#B7CDBD',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },

  /* ───────────── HERO ───────────── */

  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 280,
    paddingTop: 12,
    paddingHorizontal: 17,
    paddingBottom: 23,
    borderBottomLeftRadius: 31,
    borderBottomRightRadius: 31,
    backgroundColor: UI.forest,
  },

  heroGlowOne: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(217,164,65,0.20)',
  },

  heroGlowTwo: {
    position: 'absolute',
    bottom: -125,
    left: -55,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(100,191,131,0.15)',
  },

  heroPattern: {
    ...StyleSheet.absoluteFill,
    opacity: 0.08,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '35deg' }, { scale: 1.55 }],
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  brandMark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  brandMiniText: {
    marginBottom: 1,
    color: '#B3CBBB',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  brandName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.45,
  },

  loginButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },

  loginButtonText: {
    color: '#F9FCF9',
    fontSize: 13,
    fontWeight: '800',
  },

  heroMainContent: {
    marginTop: 27,
  },

  heroHeading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.4,
  },

  heroSubheading: {
    maxWidth: '90%',
    marginTop: 5,
    color: '#C1D4C6',
    fontSize: 15,
    lineHeight: 21,
  },

  heroUtilityRow: {
    marginTop: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  locationPill: {
    minHeight: 55,
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 9,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(6,27,18,0.18)',
  },

  locationIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(217,164,65,0.14)',
  },

  locationTextWrap: {
    minWidth: 0,
    flex: 1,
  },

  locationPillLabel: {
    color: '#AFC5B5',
    fontSize: 10,
    fontWeight: '700',
  },

  locationPillValue: {
    marginTop: 2,
    color: '#F1F8F2',
    fontSize: 12,
    fontWeight: '700',
  },

  enablePill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: UI.gold,
  },

  enablePillText: {
    color: UI.forestDark,
    fontSize: 10,
    fontWeight: '800',
  },

  languageToggle: {
    padding: 4,
    flexDirection: 'row',
    gap: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  languageButton: {
    width: 34,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  languageButtonActive: {
    backgroundColor: '#FFFFFF',
  },

  languageButtonText: {
    color: '#D2E0D6',
    fontSize: 12,
    fontWeight: '800',
  },

  languageButtonTextActive: {
    color: UI.forestDark,
  },

  /* ───────────── SHARED SECTIONS ───────────── */

  section: {
    marginTop: 28,
    paddingHorizontal: 16,
  },

  sectionHead: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },

  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },

  sectionEyebrow: {
    color: '#A27422',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sectionTitle: {
    color: UI.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  seeAllButton: {
    paddingVertical: 7,
    paddingLeft: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  seeAllText: {
    color: UI.forest,
    fontSize: 13,
    fontWeight: '800',
  },

  updatedBadge: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    backgroundColor: UI.forestSoft,
  },

  updatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#45A66A',
  },

  updatedText: {
    color: UI.forest,
    fontSize: 10,
    fontWeight: '800',
  },

  /* ───────────── FACILITY CARDS ───────────── */

  facilityCard: {
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 22,
    backgroundColor: UI.surface,
    shadowColor: '#193C2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  facilityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  facilityIconBox: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: UI.forestSoft,
  },

  facilityTitleWrap: {
    minWidth: 0,
    flex: 1,
  },

  facilityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  facilityName: {
    maxWidth: '60%',
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  facilityLocation: {
    marginTop: 2,
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  verifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 7,
    backgroundColor: UI.forestSoft,
  },

  verifiedText: {
    color: UI.forest,
    fontSize: 8,
    fontWeight: '800',
  },

  distanceBox: {
    minWidth: 53,
    paddingVertical: 6,
    paddingHorizontal: 7,
    alignItems: 'center',
    gap: 2,
    borderRadius: 10,
    backgroundColor: '#F2F6F2',
  },

  distanceText: {
    color: UI.forest,
    fontSize: 10,
    fontWeight: '800',
  },

  facilityDivider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: '#ECF0EC',
  },

  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  capacityTextRow: {
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  capacityLabel: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  capacityAmount: {
    color: UI.forest,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  capacityTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: '#EAF0EB',
  },

  capacityFill: {
    height: '100%',
    minWidth: 3,
    borderRadius: 99,
  },

  capacityFootnote: {
    marginTop: 6,
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '600',
  },

  spaceStatusPill: {
    width: 33,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },

  facilityBottomRow: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  commodityTag: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  commodityTagText: {
    flex: 1,
    color: UI.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  bookButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: UI.forest,
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  /* ───────────── PRICE CARDS ───────────── */

  priceScroll: {
    gap: 13,
    paddingRight: 16,
  },

  priceCard: {
    width: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 19,
    backgroundColor: UI.surface,
    shadowColor: '#193C2B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 11,
    elevation: 2,
  },

  priceImageWrap: {
    height: 104,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EAF0E9',
  },

  priceImage: {
    width: '100%',
    height: '100%',
  },

  priceImageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,37,25,0.10)',
  },

  priceCategoryBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    maxWidth: 120,
    paddingVertical: 5,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(18,48,34,0.70)',
  },

  priceCategoryText: {
    maxWidth: 83,
    overflow: 'hidden',
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    textOverflow: 'ellipsis',
  },

  priceImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    backgroundColor: '#EAF1E8',
  },

  priceImageFallbackText: {
    color: UI.forest,
    fontSize: 11,
    fontWeight: '800',
  },

  priceContent: {
    padding: 12,
  },

  priceCommodityName: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },

  priceMandiRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  priceMandiText: {
    minWidth: 0,
    flex: 1,
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  priceFooter: {
    marginTop: 13,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EDF1ED',
  },

  priceUnitText: {
    marginBottom: 2,
    color: UI.textSoft,
    fontSize: 9,
    fontWeight: '700',
  },

  priceValue: {
    color: UI.forest,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.35,
  },

  priceArrowButton: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: UI.forestSoft,
  },

  /* ───────────── EMPTY STATE ───────────── */

  emptyCard: {
    paddingVertical: 31,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 20,
    backgroundColor: UI.surface,
  },

  emptyIconWrap: {
    width: 47,
    height: 47,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: UI.forestSoft,
  },

  emptyTitle: {
    marginTop: 12,
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptySub: {
    marginTop: 5,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  /* ───────────── GUEST CTA ───────────── */

  guestSection: {
    marginTop: 31,
    paddingHorizontal: 16,
  },

  guestCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 19,
    borderRadius: 23,
    backgroundColor: UI.forest,
  },

  guestGlowOne: {
    position: 'absolute',
    top: -70,
    right: -45,
    width: 165,
    height: 165,
    borderRadius: 99,
    backgroundColor: 'rgba(217,164,65,0.22)',
  },

  guestGlowTwo: {
    position: 'absolute',
    left: -55,
    bottom: -90,
    width: 150,
    height: 150,
    borderRadius: 99,
    backgroundColor: 'rgba(103,191,130,0.18)',
  },

  guestIcon: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  guestContent: {
    marginTop: 15,
  },

  guestEyebrow: {
    color: '#DDB763',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  guestTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  guestSub: {
    maxWidth: '88%',
    marginTop: 5,
    color: '#BCD1C0',
    fontSize: 13,
    lineHeight: 19,
  },

  guestPrimaryButton: {
    minHeight: 48,
    marginTop: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#F5D88E',
  },

  guestPrimaryText: {
    color: UI.forestDark,
    fontSize: 14,
    fontWeight: '800',
  },

  guestLoginButton: {
    minHeight: 39,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestLoginText: {
    color: '#D7E4D9',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
