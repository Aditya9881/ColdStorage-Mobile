import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';

type LotStatus = {
  label: string;
  color: string;
  bg: string;
};

const STATUS_MAP: Record<string, LotStatus> = {
  STORED: {
    label: 'Stored',
    color: '#087F5B',
    bg: '#E5F8EF',
  },
  PARTIALLY_RELEASED: {
    label: 'Partially Released',
    color: '#B96A10',
    bg: '#FFF5DE',
  },
  FULLY_RELEASED: {
    label: 'Fully Released',
    color: '#667085',
    bg: '#F2F4F7',
  },
  INTAKE_PENDING: {
    label: 'Intake Pending',
    color: '#087D9D',
    bg: '#E8F8FC',
  },
  EXPIRED: {
    label: 'Expired',
    color: '#C63E42',
    bg: '#FFF0F0',
  },
};

const UI = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  forest: '#103E34',
  forestDeep: '#082B24',
  forestLight: '#1C5A48',
  teal: '#0D8D8A',
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  gold: '#C88C20',
  goldSoft: '#FFF7E5',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  ink: '#15231D',
  muted: '#718079',
  subtle: '#96A19B',
  border: '#E2E9E3',
  danger: '#D94A4A',
  dangerSoft: '#FFF0F0',
  lavender: '#F0EBFF',
  lavenderText: '#7457BE',
};

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lot, setLot] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function loadLotDetails(isManualRetry = false) {
    if (!id) {
      setLot(null);
      setLoadError('No lot was selected.');
      setLoading(false);
      return;
    }

    if (isManualRetry) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const lotsRes = await api.get<any>('/inventory/my-lots?limit=100');

      if (!lotsRes.success || !lotsRes.data?.lots) {
        setLot(null);
        setLoadError('Unable to load this lot. Please try again.');
        return;
      }

      const foundLot = lotsRes.data.lots.find(
        (item: any) => String(item.id) === String(id)
      );

      if (!foundLot) {
        setLot(null);
        setLoadError('This lot is no longer available in your inventory.');
        return;
      }

      setLot(foundLot);

      try {
        const healthRes = await api.get<any>(
          `/inventory/my-lots/${id}/health`
        );

        if (healthRes.success) {
          setHealth(healthRes.data);
        }
      } catch {
        setHealth(null);
      }
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();

      const isRateLimited =
        error?.status === 429 ||
        error?.code === 'RATE_LIMITED' ||
        message.includes('too many requests') ||
        message.includes('rate limit');

      if (isRateLimited) {
        setLoadError(
          'Too many requests. Please wait a few seconds before trying again.'
        );
      } else {
        setLoadError(
          error?.message || 'Unable to load lot details. Please try again.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLotDetails();
  }, [id]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.center}>
          <ActivityIndicator size="large" color={UI.forest} />
          <Text style={styles.loadingText}>Loading lot details...</Text>
        </View>
      </>
    );
  }

  if (loadError && !lot) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <SafeAreaView style={styles.errorScreen} edges={['top', 'bottom']}>
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={35}
                color="#C26935"
              />
            </View>

            <Text style={styles.errorTitle}>Could not load lot</Text>

            <Text style={styles.errorDescription}>{loadError}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadLotDetails(true)}
              activeOpacity={0.85}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={17} color={UI.forest} />
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!lot) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />

        <SafeAreaView style={styles.errorScreen} edges={['top', 'bottom']}>
          <View style={styles.errorCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={38}
                color={UI.muted}
              />
            </View>

            <Text style={styles.errorTitle}>Lot not found</Text>

            <Text style={styles.errorDescription}>
              This lot may no longer be available in your inventory.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.retryButton}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={17} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const badge = STATUS_MAP[lot.status] || STATUS_MAP.STORED;

  const weight = Number(lot.currentWeightKg || 0);
  const intakeWeight = Number(lot.intakeWeightKg || 0);
  const daysSinceIntake = Number(lot.daysSinceIntake || 0);
  const rent = Number(lot.estimatedRent || 0);

  const estimatedMarketPrice = Number(
    lot.pricePerKg || lot.listingPrice || 0
  );

  const estimatedLotValue =
    estimatedMarketPrice > 0 ? weight * estimatedMarketPrice : 0;

  const loanEligibility = estimatedLotValue * 0.7;

  const canTakeAction =
    lot.status === 'STORED' || lot.status === 'PARTIALLY_RELEASED';

  const facilityLocation = [
    lot.facility?.city,
    lot.facility?.state,
    lot.chamber?.chamberNumber
      ? `Chamber ${lot.chamber.chamberNumber}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const hasHealthData = Boolean(health?.current);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[UI.forestDeep, UI.forest, '#087B73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <SafeAreaView edges={['top']}>
              <View style={styles.heroTopRow}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={27} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.heroNavTitle}>Lot Details</Text>

                <TouchableOpacity
                  style={styles.moreButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    Alert.alert(
                      'Lot options',
                      'More actions for this lot will be available here.'
                    )
                  }
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={21}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            <View style={styles.heroContent}>
              <View style={styles.lotIdentityRow}>
                <View style={styles.heroLotIcon}>
                  <Ionicons name="cube-outline" size={25} color="#FFFFFF" />
                </View>

                <View style={styles.lotIdentityText}>
                  <Text style={styles.heroLotNumber}>
                    {lot.lotNumber || 'WAREHOUSE LOT'}
                  </Text>

                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {lot.commodityName || 'Unnamed Lot'}
                  </Text>

                  <Text style={styles.heroSubtitle}>
                    {(lot.commodityCategory || 'Agricultural Produce')
                      .replace(/_/g, ' ')
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={[styles.statusPill, { backgroundColor: badge.bg }]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: badge.color },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStats}>
                <HeroStat
                  value={`${(weight / 1000).toFixed(2)}`}
                  label="MT AVAILABLE"
                />

                <View style={styles.heroStatDivider} />

                <HeroStat value={lot.qualityGrade || '—'} label="GRADE" />

                <View style={styles.heroStatDivider} />

                <HeroStat
                  value={`${daysSinceIntake}`}
                  label="DAYS STORED"
                />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.sectionIntro}>
              <Text style={styles.sectionIntroEyebrow}>LOT OVERVIEW</Text>
              <Text style={styles.sectionIntroTitle}>
                Storage, condition and value
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: UI.emeraldSoft },
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={UI.forestLight}
                  />
                </View>

                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionEyebrow}>STORAGE FACILITY</Text>
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {lot.facility?.name || 'Storage facility unavailable'}
                  </Text>
                </View>
              </View>

              <View style={styles.locationMeta}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={UI.muted}
                />
                <Text style={styles.locationText}>
                  {facilityLocation || 'Location details unavailable'}
                </Text>
              </View>
            </View>

            {hasHealthData && (
              <View style={styles.sectionCard}>
                <View style={styles.healthHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>
                      CHAMBER CONDITIONS
                    </Text>
                    <Text style={styles.sectionTitle}>
                      Live Storage Health
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.livePill,
                      health.current.isAlert && styles.livePillAlert,
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        health.current.isAlert && styles.liveDotAlert,
                      ]}
                    />
                    <Text
                      style={[
                        styles.liveText,
                        health.current.isAlert && styles.liveTextAlert,
                      ]}
                    >
                      {health.current.isAlert ? 'ALERT' : 'LIVE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.healthGrid}>
                  <HealthTile
                    icon="thermometer-outline"
                    value={`${Number(health.current.temperature || 0).toFixed(
                      1
                    )}°C`}
                    label="TEMPERATURE"
                    color={
                      health.current.isAlert ? UI.danger : UI.emerald
                    }
                    background={
                      health.current.isAlert
                        ? UI.dangerSoft
                        : UI.emeraldSoft
                    }
                  />

                  <HealthTile
                    icon="water-outline"
                    value={
                      health.current.humidity !== null &&
                      health.current.humidity !== undefined
                        ? `${Number(health.current.humidity).toFixed(0)}%`
                        : '—'
                    }
                    label="HUMIDITY"
                    color={UI.blue}
                    background={UI.blueSoft}
                  />
                </View>

                <View style={styles.healthFooter}>
                  <Ionicons
                    name={
                      health.current.isAlert
                        ? 'alert-circle-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={18}
                    color={
                      health.current.isAlert ? UI.danger : UI.emerald
                    }
                  />

                  <Text style={styles.healthFooterText}>
                    {health.current.isAlert
                      ? 'Attention required: chamber conditions are outside the ideal range.'
                      : 'Conditions are stable and monitored in real time.'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: UI.lavender },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={UI.lavenderText}
                  />
                </View>

                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionEyebrow}>INVENTORY DETAILS</Text>
                  <Text style={styles.sectionTitle}>Lot Information</Text>
                </View>
              </View>

              <View style={styles.factGrid}>
                <PremiumFact
                  icon="scale-outline"
                  label="Current Weight"
                  value={`${(weight / 1000).toFixed(2)} MT`}
                />

                <PremiumFact
                  icon="download-outline"
                  label="Intake Weight"
                  value={`${(intakeWeight / 1000).toFixed(2)} MT`}
                />

                <PremiumFact
                  icon="layers-outline"
                  label="Total Bags"
                  value={`${lot.bagCount || '—'}`}
                />

                <PremiumFact
                  icon="water-outline"
                  label="Moisture"
                  value={
                    lot.moistureContent !== null &&
                    lot.moistureContent !== undefined
                      ? `${Number(lot.moistureContent)}%`
                      : '—'
                  }
                />
              </View>
            </View>

            <View style={styles.rentCard}>
              <View style={styles.rentTopRow}>
                <View style={styles.rentIconBox}>
                  <Ionicons
                    name="wallet-outline"
                    size={22}
                    color={UI.gold}
                  />
                </View>

                <View style={styles.rentHeaderText}>
                  <Text style={styles.rentEyebrow}>ACCRUED STORAGE RENT</Text>
                  <Text style={styles.rentTitle}>Rent Ledger</Text>
                </View>

                <Ionicons
                  name="receipt-outline"
                  size={21}
                  color="#A78A55"
                />
              </View>

              <Text style={styles.rentAmount}>₹{rent.toLocaleString()}</Text>

              <View style={styles.rentFormula}>
                <Text style={styles.rentFormulaText}>
                  {daysSinceIntake} days
                </Text>
                <Text style={styles.rentFormulaDivider}>×</Text>
                <Text style={styles.rentFormulaText}>
                  ₹{Number(lot.appliedRate || 0).toFixed(0)}/MT/day
                </Text>
                <Text style={styles.rentFormulaDivider}>×</Text>
                <Text style={styles.rentFormulaText}>
                  {(weight / 1000).toFixed(2)} MT
                </Text>
              </View>
            </View>

            {canTakeAction && (
              <View style={styles.financeCard}>
                <View style={styles.financeTopRow}>
                  <View style={styles.financeBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={15}
                      color="#2563EB"
                    />
                    <Text style={styles.financeBadgeText}>eNWR SECURED</Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={UI.muted}
                  />
                </View>

                <Text style={styles.financeTitle}>
                  Unlock value from your stock
                </Text>

                <Text style={styles.financeDescription}>
                  Use your digital warehouse receipt to access financing without
                  selling your produce today.
                </Text>

                <View style={styles.financeValues}>
                  <View style={styles.financeValueBlock}>
                    <Text style={styles.financeValueLabel}>EST. LOT VALUE</Text>
                    <Text style={styles.financeValue}>
                      ₹
                      {estimatedLotValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>

                  <View style={styles.financeDivider} />

                  <View style={styles.financeValueBlock}>
                    <Text style={styles.financeValueLabel}>UP TO 70% LOAN</Text>
                    <Text
                      style={[
                        styles.financeValue,
                        { color: UI.emerald },
                      ]}
                    >
                      ₹
                      {loanEligibility.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.financeButton}
                  activeOpacity={0.85}
                  onPress={() =>
                    Alert.alert(
                      'eNWR Financing Request',
                      'Your request has been submitted to partner banks. A representative will contact you shortly.'
                    )
                  }
                >
                  <Text style={styles.financeButtonText}>Explore Financing</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: canTakeAction ? 130 : 35 }} />
          </View>
        </ScrollView>

        {canTakeAction && (
          <SafeAreaView edges={['bottom']} style={styles.actionDock}>
            <TouchableOpacity
              style={styles.receiptButton}
              activeOpacity={0.8}
              onPress={() => router.push('/receipts')}
            >
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={UI.forest}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.85}
              onPress={() => router.push('/listing/create')}
            >
              <Ionicons name="pricetag-outline" size={19} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>List Lot for Sale</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    </>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function HealthTile({
  icon,
  value,
  label,
  color,
  background,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.healthTile, { backgroundColor: background }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.healthValue, { color }]}>{value}</Text>
      <Text style={styles.healthLabel}>{label}</Text>
    </View>
  );
}

function PremiumFact({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.factItem}>
      <View style={styles.factIconBox}>
        <Ionicons name={icon} size={17} color="#60726A" />
      </View>

      <View style={styles.factTextWrap}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  scrollView: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  content: {
    backgroundColor: UI.canvas,
  },

  center: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.canvas,
  },

  loadingText: {
    marginTop: 13,
    color: UI.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  errorScreen: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: UI.canvas,
  },

  errorCard: {
    padding: 27,
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

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0EB',
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
    lineHeight: 20,
    textAlign: 'center',
  },

  retryButton: {
    minHeight: 49,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: UI.forest,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  goBackButton: {
    marginTop: 17,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  goBackText: {
    color: UI.forest,
    fontSize: 13,
    fontWeight: '800',
  },

  hero: {
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  heroTopRow: {
    minHeight: 58,
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  heroNavTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  lotIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroLotIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  lotIdentityText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  heroLotNumber: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.75,
  },

  heroTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  heroStats: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },

  heroStat: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  heroStatLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  heroStatDivider: {
    width: 1,
    height: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  sectionIntro: {
    paddingHorizontal: 21,
    paddingTop: 23,
    paddingBottom: 2,
  },

  sectionIntroEyebrow: {
    color: UI.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  sectionIntroTitle: {
    marginTop: 5,
    color: UI.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  sectionCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sectionTitleWrap: {
    flex: 1,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionEyebrow: {
    color: '#78857E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  sectionTitle: {
    marginTop: 2,
    color: UI.ink,
    fontSize: 17,
    fontWeight: '800',
  },

  locationMeta: {
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  locationText: {
    flex: 1,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  livePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: UI.emeraldSoft,
  },

  livePillAlert: {
    backgroundColor: UI.dangerSoft,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: UI.emerald,
  },

  liveDotAlert: {
    backgroundColor: UI.danger,
  },

  liveText: {
    color: '#087D58',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  liveTextAlert: {
    color: UI.danger,
  },

  healthGrid: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },

  healthTile: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
  },

  healthValue: {
    marginTop: 15,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  healthLabel: {
    marginTop: 5,
    color: '#738079',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.55,
  },

  healthFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  healthFooterText: {
    flex: 1,
    color: '#708078',
    fontSize: 12,
    lineHeight: 17,
  },

  factGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  factItem: {
    width: '47%',
    minHeight: 62,
    padding: 11,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#F7F9F6',
  },

  factIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0EB',
  },

  factTextWrap: {
    flex: 1,
  },

  factLabel: {
    color: '#78837D',
    fontSize: 10,
    fontWeight: '600',
  },

  factValue: {
    marginTop: 2,
    color: UI.ink,
    fontSize: 13,
    fontWeight: '800',
  },

  rentCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 19,
    borderRadius: 22,
    backgroundColor: UI.goldSoft,
    borderWidth: 1,
    borderColor: '#F2DFB2',
  },

  rentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rentIconBox: {
    width: 42,
    height: 42,
    marginRight: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0C7',
  },

  rentHeaderText: {
    flex: 1,
  },

  rentEyebrow: {
    color: '#A67A2B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  rentTitle: {
    marginTop: 2,
    color: '#4F3D1F',
    fontSize: 17,
    fontWeight: '800',
  },

  rentAmount: {
    marginTop: 21,
    color: '#B77912',
    fontSize: 37,
    fontWeight: '900',
    letterSpacing: -1,
  },

  rentFormula: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  rentFormulaText: {
    color: '#887553',
    fontSize: 12,
    fontWeight: '600',
  },

  rentFormulaDivider: {
    color: '#C49C53',
    fontSize: 13,
    fontWeight: '800',
  },

  financeCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 18,
    borderRadius: 22,
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: '#D8E7F8',
    shadowColor: '#164E8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },

  financeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  financeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
  },

  financeBadgeText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.45,
  },

  financeTitle: {
    marginTop: 17,
    color: UI.ink,
    fontSize: 20,
    fontWeight: '800',
  },

  financeDescription: {
    marginTop: 7,
    color: UI.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  financeValues: {
    marginTop: 18,
    padding: 14,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
  },

  financeValueBlock: {
    flex: 1,
  },

  financeValueLabel: {
    color: '#83908A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.45,
  },

  financeValue: {
    marginTop: 5,
    color: '#1C2B24',
    fontSize: 15,
    fontWeight: '800',
  },

  financeDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: '#E1E9E3',
  },

  financeButton: {
    minHeight: 50,
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  financeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  actionDock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 11,
    borderTopWidth: 1,
    borderTopColor: '#E3E8E1',
    backgroundColor: 'rgba(245,247,244,0.98)',
  },

  receiptButton: {
    width: 55,
    minHeight: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EFE9',
  },

  primaryAction: {
    flex: 1,
    minHeight: 55,
    borderRadius: 16,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});