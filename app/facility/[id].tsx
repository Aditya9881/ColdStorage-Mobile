/**
 * Premium Facility Detail Screen — ColdStorage Mobile
 *
 * Rich facility view with:
 * - Gradient hero header with name, rating, verification badge
 * - Live capacity visualization with animated progress
 * - Chamber cards with temperature, humidity, commodity tags
 * - Pricing table with commodity icons
 * - Interactive star rating + reviews section
 * - Contact & location info
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

const { width } = Dimensions.get('window');

const COMMODITY_ICON: Record<string, string> = {
  POTATO: 'nutrition-outline', ONION: 'ellipse-outline', VEGETABLES: 'leaf-outline', FRUITS: 'nutrition',
  GRAINS: 'sunny-outline', DAIRY: 'water-outline', SPICES: 'flame-outline', OTHER: 'cube-outline',
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
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function submitReview() {
    if (rating < 1) { Alert.alert('Rating Required', 'Please select a star rating'); return; }
    setSubmitting(true);
    try {
      await api.post(`/discover/facilities/${id}/reviews`, { rating, comment });
      Alert.alert('Thank you!', 'Your review has been submitted');
      const res = await api.get<any>(`/discover/facilities/${id}`);
      if (res.success) setFacility(res.data);
      setRating(0); setComment('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit review');
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text style={styles.loadingText}>Loading facility details...</Text>
      </View>
    );
  }

  if (!facility) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text style={styles.errorTitle}>Facility not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalOccupied = Number(facility.totalCapacityMt) - (facility.availableCapacity || 0);
  const utilization = Number(facility.totalCapacityMt) > 0
    ? Math.round((totalOccupied / Number(facility.totalCapacityMt)) * 100) : 0;

  return (
    <View style={styles.container}>
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={['#0F2419', '#1B4332', '#2D6A4F']}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="snow" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{facility.name}</Text>
            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.heroLocation}>
                {facility.addressLine1}, {facility.city}, {facility.state} - {facility.pincode}
              </Text>
            </View>
          </View>
        </View>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          {facility.verifiedAt && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#059669" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{facility.storageType}</Text>
          </View>
          {facility.operatingSince && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>Since {new Date(facility.operatingSince).getFullYear()}</Text>
            </View>
          )}
        </View>

        {/* Rating */}
        {facility.avgRating && (
          <View style={styles.heroRating}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons key={i} name={i <= Math.round(facility.avgRating) ? 'star' : 'star-outline'} size={16} color="#FBBF24" />
              ))}
            </View>
            <Text style={styles.ratingNumber}>{Number(facility.avgRating).toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>({facility._count?.reviews || 0} reviews)</Text>
          </View>
        )}

        {/* Quick stats */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{Number(facility.totalCapacityMt)} MT</Text>
            <Text style={styles.heroStatLabel}>Total Capacity</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { color: '#34D399' }]}>
              {Math.round(facility.availableCapacity)} MT
            </Text>
            <Text style={styles.heroStatLabel}>Available</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, utilization > 85 ? { color: '#F87171' } : {}]}>
              {utilization}%
            </Text>
            <Text style={styles.heroStatLabel}>Utilization</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab Switcher ── */}
      <View style={styles.tabBar}>
        {(['overview', 'chambers', 'reviews'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <View style={styles.tabContent}>
          {/* Capacity Bar */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Storage Capacity</Text>
            <View style={styles.capacityBarOuter}>
              <View style={[styles.capacityBarFill, {
                width: `${utilization}%`,
                backgroundColor: utilization > 85 ? '#DC2626' : utilization > 60 ? '#F59E0B' : '#059669',
              }]} />
            </View>
            <View style={styles.capacityLabels}>
              <Text style={styles.capUsed}>{Math.round(totalOccupied)} MT used</Text>
              <Text style={styles.capAvail}>{Math.round(facility.availableCapacity)} MT free</Text>
            </View>
          </View>

          {/* Pricing */}
          {facility.pricing?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Storage Rates</Text>
              {facility.pricing.map((p: any, i: number) => (
                <View key={i} style={styles.pricingRow}>
                  <View style={styles.pricingLeft}>
                    <View style={styles.pricingIconBox}>
                      <Ionicons name={(COMMODITY_ICON[p.commodityCategory] || 'cube-outline') as any} size={20} color="#2D6A4F" />
                    </View>
                    <Text style={styles.pricingCommodity}>
                      {p.commodityCategory?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <View style={styles.pricingRight}>
                    <Text style={styles.pricingAmount}>₹{Number(p.rateAmount).toFixed(0)}</Text>
                    <Text style={styles.pricingUnit}>
                      /{p.pricingModel === 'PER_DAY_PER_MT' ? 'day/MT' : 'mo/MT'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Contact */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact & Location</Text>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={16} color="#2D6A4F" />
              <Text style={styles.contactText}>{facility.contactPhone || 'N/A'}</Text>
            </View>
            {facility.contactEmail && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color="#2D6A4F" />
                <Text style={styles.contactText}>{facility.contactEmail}</Text>
              </View>
            )}
            <View style={styles.contactRow}>
              <Ionicons name="navigate-outline" size={16} color="#2D6A4F" />
              <Text style={styles.contactText}>
                {facility.latitude?.toFixed(4)}°N, {facility.longitude?.toFixed(4)}°E
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── CHAMBERS TAB ── */}
      {activeTab === 'chambers' && (
        <View style={styles.tabContent}>
          {facility.chambers?.length > 0 ? (
            facility.chambers.map((ch: any) => {
              const chUtil = Number(ch.capacityMt) > 0
                ? Math.round((Number(ch.occupiedMt) / Number(ch.capacityMt)) * 100) : 0;
              return (
                <View key={ch.id} style={styles.chamberCard}>
                  <View style={styles.chamberHeader}>
                    <View style={styles.chamberBadge}>
                      <Text style={styles.chamberBadgeText}>{ch.chamberNumber}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chamberName}>{ch.name || `Chamber ${ch.chamberNumber}`}</Text>
                      <Text style={styles.chamberCommodity}>
                        <Ionicons name={(COMMODITY_ICON[ch.commodityCategory] || 'cube-outline') as any} size={12} color="#6B7280" /> {ch.commodityCategory?.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: ch.status === 'OPERATIONAL' ? '#059669' : '#D97706' }]} />
                  </View>

                  {/* Chamber stats grid */}
                  <View style={styles.chamberStats}>
                    <View style={styles.chamberStatItem}>
                      <Ionicons name="thermometer-outline" size={16} color="#0891B2" />
                      <Text style={styles.chamberStatValue}>{Number(ch.targetTempMin)}°C - {Number(ch.targetTempMax)}°C</Text>
                      <Text style={styles.chamberStatLabel}>Temperature</Text>
                    </View>
                    <View style={styles.chamberStatItem}>
                      <Ionicons name="water-outline" size={16} color="#7C3AED" />
                      <Text style={styles.chamberStatValue}>{ch.targetHumidityMin}-{ch.targetHumidityMax}%</Text>
                      <Text style={styles.chamberStatLabel}>Humidity</Text>
                    </View>
                    <View style={styles.chamberStatItem}>
                      <Ionicons name="cube-outline" size={16} color="#2D6A4F" />
                      <Text style={styles.chamberStatValue}>{chUtil}% full</Text>
                      <Text style={styles.chamberStatLabel}>{Number(ch.occupiedMt)}/{Number(ch.capacityMt)} MT</Text>
                    </View>
                  </View>

                  {/* Mini capacity bar */}
                  <View style={styles.miniBarBg}>
                    <View style={[styles.miniBarFill, { width: `${chUtil}%`, backgroundColor: chUtil > 85 ? '#DC2626' : '#2D6A4F' }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No chamber data available</Text>
            </View>
          )}
        </View>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <View style={styles.tabContent}>
          {/* Write review */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Write a Review</Text>
            <View style={styles.starSelect}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starBtn}>
                  <Ionicons
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={34}
                    color={i <= rating ? '#FBBF24' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this facility..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
              onPress={submitReview}
              disabled={submitting}
            >
              <LinearGradient colors={['#2D6A4F', '#40916C']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: Spacing.sm, alignItems: 'center', padding: Spacing.sm }}
              onPress={() => router.push({
                pathname: '/facility/review',
                params: { facilityId: id, facilityName: facility?.name },
              })}
            >
              <Text style={{ color: '#2D6A4F', fontSize: FontSize.sm, fontWeight: FontWeight.semibold }}>
                ✍️ Write a detailed review instead
              </Text>
            </TouchableOpacity>
          </View>

          {/* Existing reviews */}
          {facility.reviews?.length > 0 && facility.reviews.slice(0, 10).map((r: any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{r.user?.fullName?.[0] || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewUserName}>{r.user?.fullName}</Text>
                  <View style={styles.reviewStarsRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name={i <= r.rating ? 'star' : 'star-outline'} size={12} color="#FBBF24" />
                    ))}
                  </View>
                </View>
              </View>
              {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
            </View>
          ))}

          {(!facility.reviews || facility.reviews.length === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No reviews yet — be the first!</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>

    {/* Floating Book Storage CTA */}
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
          colors={['#2D6A4F', '#40916C']}
          style={styles.ctaGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="calendar-outline" size={20} color="#FFF" />
          <Text style={styles.ctaText}>Book Storage</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAF7', gap: 12 },
  loadingText: { fontSize: 14, color: '#9CA3AF' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  backLink: { fontSize: 14, color: '#2D6A4F', fontWeight: '600', marginTop: 8 },

  // ── Hero ──
  hero: { paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 20, paddingHorizontal: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  heroLocation: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18, flex: 1 },

  // Badges
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(5,150,105,0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#34D399' },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  // Rating
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingNumber: { fontSize: 16, fontWeight: '800', color: '#FBBF24' },
  reviewCountText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Stats
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#2D6A4F' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#FFFFFF' },

  // ── Tab Content ──
  tabContent: { padding: 16, gap: 14 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },

  // Capacity bar
  capacityBarOuter: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  capacityBarFill: { height: '100%', borderRadius: 4 },
  capacityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  capUsed: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  capAvail: { fontSize: 12, color: '#059669', fontWeight: '600' },

  // Pricing
  pricingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  pricingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pricingIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F7F4', alignItems: 'center', justifyContent: 'center' },
  pricingCommodity: { fontSize: 14, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  pricingRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  pricingAmount: { fontSize: 18, fontWeight: '800', color: '#2D6A4F' },
  pricingUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  contactText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // ── Chambers ──
  chamberCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  chamberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  chamberBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F0F7F4', alignItems: 'center', justifyContent: 'center',
  },
  chamberBadgeText: { fontSize: 12, fontWeight: '800', color: '#2D6A4F' },
  chamberName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  chamberCommodity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chamberStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chamberStatItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10, paddingVertical: 10, gap: 4,
  },
  chamberStatValue: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  chamberStatLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '500', textTransform: 'uppercase' },
  miniBarBg: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },

  // ── Reviews ──
  starSelect: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  starBtn: { padding: 4 },
  reviewInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1A1A2E',
    textAlignVertical: 'top', minHeight: 80, marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: { borderRadius: 12, overflow: 'hidden' },
  submitGradient: { paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  reviewCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F0F7F4', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: '#2D6A4F' },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewComment: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },

  // Floating CTA
  floatingCTA: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16, paddingTop: 12,
    backgroundColor: 'rgba(248,250,247,0.95)',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
