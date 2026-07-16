/**
 * Premium Facility Detail Screen — ColdStorage Mobile
 *
 * Upgraded facility view with:
 * - Premium gradient hero with trust + quick metrics
 * - Cleaner overview, chambers, and reviews tabs
 * - Stronger pricing and contact presentation
 * - Better spacing, safer bottom area for floating CTA
 * - All API calls unchanged
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { hapticLight } from '@/lib/haptics';

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

const UI = {
  bg: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FBF8',
  border: '#E3EAE4',
  text: '#16241D',
  textMuted: '#6F8077',
  textSoft: '#95A19B',
  forest: '#103E34',
  forestDeep: '#082B24',
  teal: '#0C8E88',
  emerald: '#17A56D',
  emeraldSoft: '#E7F7EE',
  gold: '#D29A2E',
  goldSoft: '#FFF7E6',
  blue: '#2589AA',
  blueSoft: '#EAF7FB',
  purple: '#7C3AED',
  purpleSoft: '#F2ECFF',
  danger: '#D9485F',
  warning: '#D9861D',
};

export default function FacilityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'chambers' | 'reviews'>('overview');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any>(`/discover/facilities/${id}`);
        if (res.success) setFacility(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function submitReview() {
    if (rating < 1) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/discover/facilities/${id}/reviews`, { rating, comment });
      Alert.alert('Thank you!', 'Your review has been submitted');
      const res = await api.get<any>(`/discover/facilities/${id}`);
      if (res.success) setFacility(res.data);
      setRating(0);
      setComment('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <ActivityIndicator size="large" color={UI.forest} />
          <Text style={styles.loadingText}>Loading facility details...</Text>
        </View>
      </>
    );
  }

  if (!facility) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#CDD5D0" />
          <Text style={styles.errorTitle}>Facility not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={styles.backBtn}
          >
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const totalCapacity = Number(facility.totalCapacityMt || 0);
  const availableCapacity = Number(facility.availableCapacity || 0);
  const totalOccupied = totalCapacity - availableCapacity;
  const utilization =
    totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const avgRating = Number(facility.avgRating || facility.averageRating || 0);
  const reviewCount = Number(facility._count?.reviews || facility.reviewCount || 0);

  const utilizationColor =
    utilization > 85 ? UI.danger : utilization > 60 ? UI.warning : UI.emerald;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[UI.forestDeep, UI.forest, '#0A786F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={{ height: Platform.OS === 'ios' ? 48 : 20 }} />

            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navIconBtn}
                activeOpacity={0.82}
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navIconBtn}
                activeOpacity={0.82}
                onPress={() => {
                  hapticLight();
                  router.push({
                    pathname: '/book-storage',
                    params: { facilityId: id, facilityName: facility?.name },
                  });
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="snow-outline" size={26} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>VERIFIED FACILITY</Text>
                <Text style={styles.heroName}>{facility.name}</Text>

                <View style={styles.heroLocationRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color="rgba(255,255,255,0.65)"
                  />
                  <Text style={styles.heroLocation}>
                    {facility.addressLine1}, {facility.city}, {facility.state} - {facility.pincode}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.badgeRow}>
              {facility.verifiedAt ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={UI.emerald} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}

              {facility.storageType ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{facility.storageType}</Text>
                </View>
              ) : null}

              {facility.operatingSince ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>
                    Since {new Date(facility.operatingSince).getFullYear()}
                  </Text>
                </View>
              ) : null}
            </View>

            {avgRating > 0 ? (
              <View style={styles.heroRating}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= Math.round(avgRating) ? 'star' : 'star-outline'}
                      size={15}
                      color="#F6C453"
                    />
                  ))}
                </View>
                <Text style={styles.ratingNumber}>{avgRating.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>({reviewCount} reviews)</Text>
              </View>
            ) : (
              <View style={styles.heroRating}>
                <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={styles.reviewCountText}>No reviews yet</Text>
              </View>
            )}

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{totalCapacity} MT</Text>
                <Text style={styles.heroStatLabel}>TOTAL CAPACITY</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: '#7EF0C1' }]}>
                  {Math.round(availableCapacity)} MT
                </Text>
                <Text style={styles.heroStatLabel}>AVAILABLE</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: utilization > 85 ? '#FF9B9B' : '#FFFFFF' }]}>
                  {utilization}%
                </Text>
                <Text style={styles.heroStatLabel}>UTILIZATION</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.tabBar}>
            {(['overview', 'chambers', 'reviews'] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, active && styles.tabActive]}
                  activeOpacity={0.82}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Storage Capacity</Text>

                <View style={styles.metricHeader}>
                  <View>
                    <Text style={styles.metricValue}>{Math.round(availableCapacity)} MT</Text>
                    <Text style={styles.metricSub}>Available now</Text>
                  </View>

                  <View style={styles.metricPill}>
                    <Text style={[styles.metricPillText, { color: utilizationColor }]}>
                      {utilization}% used
                    </Text>
                  </View>
                </View>

                <View style={styles.capacityBarOuter}>
                  <View
                    style={[
                      styles.capacityBarFill,
                      {
                        width: `${Math.min(utilization, 100)}%`,
                        backgroundColor: utilizationColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.capacityLabels}>
                  <Text style={styles.capUsed}>{Math.round(totalOccupied)} MT used</Text>
                  <Text style={styles.capAvail}>{Math.round(availableCapacity)} MT free</Text>
                </View>
              </View>

              {facility.pricing?.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Storage Rates</Text>

                  {facility.pricing.map((p: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.pricingRow,
                        i === facility.pricing.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                      ]}
                    >
                      <View style={styles.pricingLeft}>
                        <View style={styles.pricingIconBox}>
                          <Ionicons
                            name={(COMMODITY_ICON[p.commodityCategory] || 'cube-outline') as any}
                            size={18}
                            color={UI.forest}
                          />
                        </View>

                        <View>
                          <Text style={styles.pricingCommodity}>
                            {p.commodityCategory?.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.pricingMeta}>
                            {p.pricingModel === 'PER_DAY_PER_MT' ? 'Per day / MT' : 'Per month / MT'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pricingRight}>
                        <Text style={styles.pricingAmount}>₹{Number(p.rateAmount).toFixed(0)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contact & Location</Text>

                <View style={styles.contactRow}>
                  <View style={styles.contactIconWrap}>
                    <Ionicons name="call-outline" size={16} color={UI.forest} />
                  </View>
                  <Text style={styles.contactText}>{facility.contactPhone || 'N/A'}</Text>
                </View>

                {facility.contactEmail ? (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconWrap}>
                      <Ionicons name="mail-outline" size={16} color={UI.forest} />
                    </View>
                    <Text style={styles.contactText}>{facility.contactEmail}</Text>
                  </View>
                ) : null}

                <View style={styles.contactRow}>
                  <View style={styles.contactIconWrap}>
                    <Ionicons name="location-outline" size={16} color={UI.forest} />
                  </View>
                  <Text style={styles.contactText}>
                    {facility.addressLine1}, {facility.city}, {facility.state} - {facility.pincode}
                  </Text>
                </View>

                {facility.latitude && facility.longitude ? (
                  <View style={styles.contactRow}>
                    <View style={styles.contactIconWrap}>
                      <Ionicons name="navigate-outline" size={16} color={UI.forest} />
                    </View>
                    <Text style={styles.contactText}>
                      {Number(facility.latitude).toFixed(4)}, {Number(facility.longitude).toFixed(4)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {activeTab === 'chambers' && (
            <View style={styles.tabContent}>
              {facility.chambers?.length > 0 ? (
                facility.chambers.map((ch: any) => {
                  const chamberCapacity = Number(ch.capacityMt || 0);
                  const chamberOccupied = Number(ch.occupiedMt || 0);
                  const chUtil =
                    chamberCapacity > 0
                      ? Math.round((chamberOccupied / chamberCapacity) * 100)
                      : 0;

                  return (
                    <View key={ch.id} style={styles.chamberCard}>
                      <View style={styles.chamberHeader}>
                        <View style={styles.chamberBadge}>
                          <Text style={styles.chamberBadgeText}>{ch.chamberNumber}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.chamberName}>
                            {ch.name || `Chamber ${ch.chamberNumber}`}
                          </Text>

                          <View style={styles.chamberCommodityRow}>
                            <Ionicons
                              name={(COMMODITY_ICON[ch.commodityCategory] || 'cube-outline') as any}
                              size={12}
                              color={UI.textMuted}
                            />
                            <Text style={styles.chamberCommodity}>
                              {ch.commodityCategory?.replace(/_/g, ' ')}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor:
                                ch.status === 'OPERATIONAL' ? UI.emeraldSoft : '#FFF3E7',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor:
                                  ch.status === 'OPERATIONAL' ? UI.emerald : UI.warning,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  ch.status === 'OPERATIONAL' ? UI.emerald : UI.warning,
                              },
                            ]}
                          >
                            {ch.status || 'Unknown'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.chamberStats}>
                        <View style={styles.chamberStatItem}>
                          <Ionicons name="thermometer-outline" size={16} color={UI.blue} />
                          <Text style={styles.chamberStatValue}>
                            {Number(ch.targetTempMin)}°C - {Number(ch.targetTempMax)}°C
                          </Text>
                          <Text style={styles.chamberStatLabel}>Temperature</Text>
                        </View>

                        <View style={styles.chamberStatItem}>
                          <Ionicons name="water-outline" size={16} color={UI.purple} />
                          <Text style={styles.chamberStatValue}>
                            {ch.targetHumidityMin}-{ch.targetHumidityMax}%
                          </Text>
                          <Text style={styles.chamberStatLabel}>Humidity</Text>
                        </View>

                        <View style={styles.chamberStatItem}>
                          <Ionicons name="cube-outline" size={16} color={UI.forest} />
                          <Text style={styles.chamberStatValue}>{chUtil}% full</Text>
                          <Text style={styles.chamberStatLabel}>
                            {chamberOccupied}/{chamberCapacity} MT
                          </Text>
                        </View>
                      </View>

                      <View style={styles.miniBarBg}>
                        <View
                          style={[
                            styles.miniBarFill,
                            {
                              width: `${Math.min(chUtil, 100)}%`,
                              backgroundColor: chUtil > 85 ? UI.danger : UI.forest,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={40} color="#D1D8D3" />
                  <Text style={styles.emptyText}>No chamber data available</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Write a Review</Text>

                <View style={styles.starSelect}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setRating(i)}
                      style={styles.starBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={i <= rating ? 'star' : 'star-outline'}
                        size={34}
                        color={i <= rating ? '#F6C453' : '#D3D9D5'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share your experience with this facility..."
                  placeholderTextColor="#9AA6A0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}
                  onPress={submitReview}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[UI.forest, '#17745F']}
                    style={styles.submitGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailedReviewBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/facility/review',
                      params: { facilityId: id, facilityName: facility?.name },
                    })
                  }
                >
                  <Text style={styles.detailedReviewText}>Write a detailed review instead</Text>
                </TouchableOpacity>
              </View>

              {facility.reviews?.length > 0 ? (
                facility.reviews.slice(0, 10).map((r: any) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {r.user?.fullName?.[0] || '?'}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewUserName}>
                          {r.user?.fullName || 'Anonymous User'}
                        </Text>
                        <View style={styles.reviewStarsRow}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons
                              key={i}
                              name={i <= r.rating ? 'star' : 'star-outline'}
                              size={12}
                              color="#F6C453"
                            />
                          ))}
                        </View>
                      </View>
                    </View>

                    {r.comment ? (
                      <Text style={styles.reviewComment}>{r.comment}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={40} color="#D1D8D3" />
                  <Text style={styles.emptyText}>No reviews yet — be the first</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.floatingCTA}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              hapticLight();
              router.push({
                pathname: '/book-storage',
                params: { facilityId: id, facilityName: facility?.name },
              });
            }}
          >
            <LinearGradient
              colors={[UI.forest, '#17745F']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              <Text style={styles.ctaText}>Book Storage</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingBottom: Platform.OS === 'ios' ? 128 : 112,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI.bg,
    gap: 12,
    paddingHorizontal: 24,
  },

  loadingText: {
    fontSize: 14,
    color: UI.textSoft,
    fontWeight: '600',
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: UI.textMuted,
  },

  backBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
  },

  backLink: {
    fontSize: 14,
    color: UI.forest,
    fontWeight: '700',
  },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },

  heroGlowOne: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(54, 209, 180, 0.12)',
  },

  heroGlowTwo: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 200,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.62)',
    letterSpacing: 1,
    marginBottom: 4,
  },

  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingRight: 10,
  },

  heroLocation: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.67)',
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },

  verifiedBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(23,165,109,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(23,165,109,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#81E8B9',
  },

  typeBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },

  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
  },

  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },

  ratingNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F6C453',
  },

  reviewCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },

  heroStat: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  heroStatLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.52)',
    letterSpacing: 0.7,
  },

  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
    borderRadius: 16,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabActive: {
    backgroundColor: UI.forest,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textSoft,
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  tabContent: {
    padding: 16,
    gap: 14,
  },

  card: {
    backgroundColor: UI.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 14,
    letterSpacing: -0.2,
  },

  metricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.4,
  },

  metricSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: UI.textSoft,
  },

  metricPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: UI.surfaceAlt,
    borderWidth: 1,
    borderColor: UI.border,
    justifyContent: 'center',
  },

  metricPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  capacityBarOuter: {
    height: 9,
    backgroundColor: '#ECF0EC',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 9,
  },

  capacityBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  capacityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  capUsed: {
    fontSize: 12,
    color: UI.textMuted,
    fontWeight: '600',
  },

  capAvail: {
    fontSize: 12,
    color: UI.emerald,
    fontWeight: '700',
  },

  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F0',
  },

  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },

  pricingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pricingCommodity: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
    textTransform: 'capitalize',
  },

  pricingMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: UI.textSoft,
  },

  pricingRight: {
    alignItems: 'flex-end',
  },

  pricingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.forest,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },

  contactIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: UI.text,
    fontWeight: '600',
    paddingTop: 6,
  },

  chamberCard: {
    backgroundColor: UI.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  chamberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  chamberBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chamberBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.forest,
  },

  chamberName: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
  },

  chamberCommodityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },

  chamberCommodity: {
    fontSize: 12,
    color: UI.textMuted,
    fontWeight: '600',
  },

  statusPill: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  chamberStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  chamberStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: UI.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#EEF2EE',
  },

  chamberStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text,
    textAlign: 'center',
  },

  chamberStatLabel: {
    fontSize: 9,
    color: UI.textSoft,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  miniBarBg: {
    height: 5,
    backgroundColor: '#ECF0EC',
    borderRadius: 999,
    overflow: 'hidden',
  },

  miniBarFill: {
    height: '100%',
    borderRadius: 999,
  },

  starSelect: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },

  starBtn: {
    padding: 4,
  },

  reviewInput: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: UI.text,
    minHeight: 96,
    marginBottom: 14,
    backgroundColor: '#FAFCFA',
  },

  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  submitGradient: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  detailedReviewBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },

  detailedReviewText: {
    color: UI.forest,
    fontSize: 13,
    fontWeight: '700',
  },

  reviewCard: {
    backgroundColor: UI.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.forest,
  },

  reviewUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
  },

  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },

  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
    color: UI.textMuted,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },

  emptyText: {
    fontSize: 14,
    color: UI.textSoft,
    fontWeight: '600',
  },

  floatingCTA: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(245,247,244,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E4EAE4',
  },

  ctaGradient: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});