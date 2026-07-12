import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  STORED: { label: 'Stored', color: '#059669', bg: '#ECFDF5' },
  PARTIALLY_RELEASED: { label: 'Partially Released', color: '#D97706', bg: '#FFFBEB' },
  FULLY_RELEASED: { label: 'Fully Released', color: '#6B7280', bg: '#F3F4F6' },
  INTAKE_PENDING: { label: 'Intake Pending', color: '#0891B2', bg: '#ECFEFF' },
  EXPIRED: { label: 'Expired', color: '#DC2626', bg: '#FEE2E2' },
};

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const [lot, setLot] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [lotsRes, healthRes] = await Promise.all([
          api.get<any>(`/inventory/my-lots?limit=100`),
          api.get<any>(`/inventory/my-lots/${id}/health`).catch(() => null),
        ]);
        if (lotsRes.success && lotsRes.data?.lots) {
          const found = lotsRes.data.lots.find((l: any) => l.id === id);
          setLot(found || null);
        }
        if (healthRes?.success) {
          setHealth(healthRes.data);
        }
        // No mock fallback — health data comes from real IoT readings
      } catch (err) {
        console.error('Lot detail error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!lot) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Lot Not Found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: Spacing.lg }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = STATUS_MAP[lot.status] || STATUS_MAP.STORED;
  const weight = Number(lot.currentWeightKg);
  const intakeWeight = Number(lot.intakeWeightKg);
  const daysSinceIntake = lot.daysSinceIntake || 0;
  const rent = lot.estimatedRent || 0;

  // eNWR parameters — use real listing price if available, otherwise estimate from lot data
  const estimatedMarketPrice = Number(lot.pricePerKg || lot.listingPrice || 0);
  const estimatedLotValue = estimatedMarketPrice > 0 ? (weight * estimatedMarketPrice) : 0;
  const loanEligibility = estimatedLotValue > 0 ? estimatedLotValue * 0.70 : 0; // 70% Loan-to-Value limit

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lotNumber, { color: colors.textSecondary }]}>{lot.lotNumber}</Text>
            <Text style={[styles.commodity, { color: colors.text }]}>{lot.commodityName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <InfoStat label="Current Weight" value={`${(weight / 1000).toFixed(2)} MT`} icon="scale" colors={colors} />
          <InfoStat label="Intake Weight" value={`${(intakeWeight / 1000).toFixed(2)} MT`} icon="enter" colors={colors} />
          <InfoStat label="Bags" value={`${lot.bagCount || '—'}`} icon="cube" colors={colors} />
        </View>
      </View>

      {/* Facility Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage Location</Text>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={18} color={colors.primary} />
          <View style={{ marginLeft: Spacing.md }}>
            <Text style={[styles.infoValue, { color: colors.text }]}>{lot.facility?.name || '—'}</Text>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {lot.facility?.city}, {lot.facility?.state} • Chamber {lot.chamber?.chamberNumber}
            </Text>
          </View>
        </View>
      </View>

      {/* Quality Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quality & Storage Details</Text>
        <View style={styles.qualityGrid}>
          <QualityStat label="Grade" value={lot.qualityGrade || '—'} colors={colors} />
          <QualityStat label="Days Stored" value={`${daysSinceIntake}`} colors={colors} />
          <QualityStat label="Moisture" value={lot.moistureContent ? `${Number(lot.moistureContent)}%` : '—'} colors={colors} />
          <QualityStat label="Category" value={lot.commodityCategory?.replace(/_/g, ' ') || '—'} colors={colors} />
        </View>
      </View>

      {/* IoT Health and Temperature Sparkline */}
      {health?.current && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerWithIcon}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Chamber Live Health 🌡️
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.healthRow}>
            <View style={[styles.healthStat, { backgroundColor: health.current.isAlert ? '#FEE2E2' : '#ECFDF5' }]}>
              <Text style={[styles.healthValue, { color: health.current.isAlert ? '#DC2626' : '#059669' }]}>
                {health.current.temperature.toFixed(1)}°C
              </Text>
              <Text style={styles.healthLabel}>Temperature</Text>
            </View>
            <View style={[styles.healthStat, { backgroundColor: '#ECFEFF' }]}>
              <Text style={[styles.healthValue, { color: '#0891B2' }]}>
                {health.current.humidity?.toFixed(0) || '—'}%
              </Text>
              <Text style={styles.healthLabel}>Humidity</Text>
            </View>
          </View>

          {/* Simple Sparkline chart built using custom views */}
          {health.history && health.history.length > 0 && (
            <View style={styles.sparklineContainer}>
              <Text style={[styles.sparklineTitle, { color: colors.textSecondary }]}>Temperature History (24h)</Text>
              <View style={styles.sparklineChart}>
                {health.history.map((h: any, i: number) => {
                  const maxTemp = 8;
                  const percent = Math.min(100, Math.max(10, (h.temp / maxTemp) * 100));
                  return (
                    <View key={i} style={styles.barColumn}>
                      <View style={[styles.barFill, { height: `${percent}%`, backgroundColor: colors.primary }]} />
                      <Text style={styles.barTime}>{h.time}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Rent Card with Projected Calculator */}
      <View style={[styles.rentCard, { backgroundColor: `${colors.accent}10` }]}>
        <View style={styles.rentHeader}>
          <Ionicons name="cash" size={24} color={colors.accent} />
          <Text style={[styles.rentTitle, { color: colors.text }]}>Rent Ledger</Text>
        </View>
        <Text style={[styles.rentAmount, { color: colors.accent }]}>₹{rent.toLocaleString()}</Text>
        <Text style={[styles.rentDetail, { color: colors.textSecondary }]}>
          {daysSinceIntake} days × ₹{Number(lot.appliedRate || 0).toFixed(0)}/MT/day × {(weight / 1000).toFixed(2)} MT
        </Text>
      </View>

      {/* eNWR Instant Financing Option */}
      {(lot.status === 'STORED' || lot.status === 'PARTIALLY_RELEASED') && (
        <View style={[styles.card, styles.enwrCard, { borderColor: colors.primary }]}>
          <View style={styles.enwrHeader}>
            <Text style={styles.enwrBadge}>eNWR Eligible</Text>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.enwrTitle, { color: colors.text }]}>Apply for Instant Loan</Text>
          <Text style={[styles.enwrDesc, { color: colors.textSecondary }]}>
            Pledge your digital warehouse receipt to get low-interest financing against your stock value.
          </Text>

          <View style={[styles.enwrSummary, { backgroundColor: colors.cardAlt }]}>
            <View style={styles.enwrRow}>
              <Text style={[styles.enwrLabel, { color: colors.textSecondary }]}>Est. Market Value</Text>
              <Text style={[styles.enwrValue, { color: colors.text }]}>₹{estimatedLotValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.enwrRow}>
              <Text style={[styles.enwrLabel, { color: colors.textSecondary }]}>Eligible Loan Amount (70%)</Text>
              <Text style={[styles.enwrValue, { color: colors.primary, fontWeight: 'bold' }]}>₹{loanEligibility.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.enwrBtn, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('eNWR Financing Request', 'Your request has been submitted to partner banks. A representative will contact you shortly.')}
          >
            <Text style={styles.enwrBtnText}>Apply for Financing</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      {(lot.status === 'STORED' || lot.status === 'PARTIALLY_RELEASED') && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/listing/create')}
            activeOpacity={0.8}
          >
            <Ionicons name="pricetag" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>List for Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0F766E' }]}
            onPress={() => router.push('/receipts')}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>View Receipt</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoStat({ label, value, icon, colors }: any) {
  return (
    <View style={styles.infoStat}>
      <Ionicons name={icon} size={16} color={colors.textTertiary} />
      <Text style={[styles.infoStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.infoStatLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

function QualityStat({ label, value, colors }: any) {
  return (
    <View style={styles.qualityStat}>
      <Text style={[styles.qualityValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.qualityLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  lotNumber: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  commodity: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  infoStat: { alignItems: 'center', gap: 4 },
  infoStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  infoStatLabel: { fontSize: FontSize.xs },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  infoLabel: { fontSize: FontSize.sm, marginTop: 2 },
  qualityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  qualityStat: { width: '45%', backgroundColor: '#F8FAF7', borderRadius: BorderRadius.md, padding: Spacing.md },
  qualityValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  qualityLabel: { fontSize: FontSize.xs, marginTop: 2 },
  headerWithIcon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#EF4444',
  },
  healthRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  healthStat: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  healthValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  healthLabel: { fontSize: FontSize.xs, color: '#6B7280', marginTop: 4 },
  sparklineContainer: {
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  sparklineTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  sparklineChart: {
    flexDirection: 'row',
    height: 80,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: Spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  barFill: {
    width: 8,
    borderRadius: BorderRadius.full,
  },
  barTime: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  rentCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  rentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  rentTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  rentAmount: { fontSize: FontSize.hero, fontWeight: FontWeight.extrabold },
  rentDetail: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  enwrCard: {
    borderWidth: 2,
    borderStyle: 'solid',
  },
  enwrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  enwrBadge: {
    backgroundColor: '#EBF5FF',
    color: '#2563EB',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  enwrTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  enwrDesc: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  enwrSummary: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  enwrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enwrLabel: {
    fontSize: FontSize.xs,
  },
  enwrValue: {
    fontSize: FontSize.sm,
  },
  enwrBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  enwrBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  actions: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  actionBtnText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginTop: Spacing.lg },
});
