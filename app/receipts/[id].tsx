/**
 * Receipt Detail Screen — eNWR view with QR code, pledge status, and share
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import StatusChip from '@/components/ui/StatusChip';

interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  lot?: {
    id: string;
    lotNumber: string;
    commodityCategory?: string;
    commodityName?: string;
    intakeWeightKg?: number;
    currentWeightKg?: number;
    bagCount?: number;
    qualityGrade?: string;
  };
  facility?: { id: string; name: string; city?: string; state?: string };
  depositor?: { id: string; fullName: string; phone?: string };
  isNegotiable: boolean;
  isPledged: boolean;
  pledgedTo?: string | null;
  pledgedAt?: string | null;
  redeemedAt?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReceipt = useCallback(async () => {
    try {
      const res = await api.get<any>(`/warehouse-receipts/${id}`);
      if (res.success && res.data) {
        setReceipt(res.data);
      }
    } catch (err) {
      console.error('[Receipt Detail] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchReceipt();
    }, [fetchReceipt])
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} MT`;
    return `${kg.toFixed(1)} kg`;
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      await Share.share({
        title: `eNWR — ${receipt.receiptNumber}`,
        message: [
          `📄 Electronic Warehouse Receipt`,
          `Receipt: ${receipt.receiptNumber}`,
          `Status: ${receipt.status}`,
          `Commodity: ${receipt.lot?.commodityName || 'N/A'}`,
          `Weight: ${receipt.lot?.currentWeightKg ? formatWeight(receipt.lot.currentWeightKg) : 'N/A'}`,
          `Facility: ${receipt.facility?.name || 'N/A'}`,
          `Issued: ${formatDate(receipt.createdAt)}`,
          receipt.isPledged ? `⚠️ Pledged to: ${receipt.pledgedTo}` : '',
        ].filter(Boolean).join('\n'),
      });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="document-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Receipt not found</Text>
      </View>
    );
  }

  // Timeline steps
  const timelineSteps = [
    { label: 'Receipt Issued', date: receipt.createdAt, done: true, icon: 'document-text' as const },
    { label: 'Pledged', date: receipt.pledgedAt, done: receipt.isPledged, icon: 'lock-closed' as const },
    { label: 'Redeemed', date: receipt.redeemedAt, done: !!receipt.redeemedAt, icon: 'lock-open' as const },
    ...(receipt.expiresAt ? [{ label: 'Expires', date: receipt.expiresAt, done: new Date(receipt.expiresAt) < new Date(), icon: 'time' as const }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* QR Code Card */}
        <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={receipt.receiptNumber}
              size={180}
              backgroundColor={colorScheme === 'dark' ? colors.card : '#FFFFFF'}
              color={colorScheme === 'dark' ? '#E5E7EB' : '#1A1A2E'}
            />
          </View>
          <Text style={[styles.receiptNumber, { color: colors.primary }]}>
            {receipt.receiptNumber}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <StatusChip status={receipt.status} size="md" />
            {receipt.isNegotiable && (
              <StatusChip status="ACTIVE" size="md" label="Negotiable" />
            )}
          </View>
        </View>

        {/* Commodity Details */}
        {receipt.lot && (
          <TouchableOpacity
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/lots/${receipt.lot!.id}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>LOT DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Number</Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>{receipt.lot.lotNumber}</Text>
            </View>
            {receipt.lot.commodityName && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Commodity</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{receipt.lot.commodityName}</Text>
              </View>
            )}
            {receipt.lot.intakeWeightKg && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Intake Weight</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatWeight(receipt.lot.intakeWeightKg)}</Text>
              </View>
            )}
            {receipt.lot.currentWeightKg && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Current Weight</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatWeight(receipt.lot.currentWeightKg)}</Text>
              </View>
            )}
            {receipt.lot.bagCount && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bags</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{receipt.lot.bagCount}</Text>
              </View>
            )}
            {receipt.lot.qualityGrade && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Grade</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{receipt.lot.qualityGrade}</Text>
              </View>
            )}
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.primary }]}>Tap to view lot →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Facility */}
        {receipt.facility && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>FACILITY</Text>
            <Text style={[styles.facilityName, { color: colors.text }]}>{receipt.facility.name}</Text>
            {receipt.facility.city && (
              <Text style={[styles.facilityMeta, { color: colors.textSecondary }]}>
                {[receipt.facility.city, receipt.facility.state].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>TIMELINE</Text>
          {timelineSteps.map((step, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: step.done ? colors.primary : colors.border },
                ]}>
                  <Ionicons
                    name={step.icon}
                    size={14}
                    color={step.done ? '#FFF' : colors.textTertiary}
                  />
                </View>
                {idx < timelineSteps.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.borderLight }]} />
                )}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[
                  styles.timelineLabel,
                  { color: step.done ? colors.text : colors.textTertiary },
                ]}>
                  {step.label}
                </Text>
                {step.date && (
                  <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>
                    {formatDate(step.date)}
                  </Text>
                )}
                {step.label === 'Pledged' && receipt.pledgedTo && (
                  <Text style={[styles.timelineMeta, { color: '#7C3AED' }]}>
                    To: {receipt.pledgedTo}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: colors.border }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share Receipt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  scrollContent: { paddingBottom: 100 },
  qrCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  qrWrapper: {
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  receiptNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: { fontSize: FontSize.sm },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tapHint: { marginTop: Spacing.md, alignItems: 'flex-end' },
  tapHintText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  facilityName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  facilityMeta: { fontSize: FontSize.sm, marginTop: 2 },
  timelineItem: { flexDirection: 'row', minHeight: 50 },
  timelineLeft: { alignItems: 'center', width: 32, marginRight: Spacing.md },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineRight: { flex: 1, paddingBottom: Spacing.md },
  timelineLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  timelineDate: { fontSize: FontSize.xs, marginTop: 2 },
  timelineMeta: { fontSize: FontSize.sm, marginTop: 4, fontWeight: FontWeight.medium },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  shareBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
