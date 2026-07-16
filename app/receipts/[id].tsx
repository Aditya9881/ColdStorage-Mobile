/**
 * Receipt Detail Screen — Premium eNWR view with QR code, pledge status, and share
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { api } from '@/lib/api-client';
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

const UI = {
  bg: '#F6F7F3',
  surface: '#FFFFFF',
  text: '#18212F',
  textMuted: '#6B7280',
  textSoft: '#9CA3AF',
  border: '#E9ECE6',
  forest: '#2D6A4F',
  forestDeep: '#163528',
  forestMid: '#1F513B',
  success: '#059669',
  warning: '#D97706',
  violet: '#7C3AED',
  danger: '#DC2626',
};

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fetchReceipt = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/warehouse-receipts/${id}`);
      if (res.success && res.data) {
        setReceipt(res.data);
      } else {
        setReceipt(null);
      }
    } catch (err) {
      console.error('[Receipt Detail] Error:', err);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchReceipt();
    }, [fetchReceipt])
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatWeight = (kg?: number | null) => {
    if (kg === undefined || kg === null) return '—';
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} MT`;
    return `${kg.toFixed(1)} kg`;
  };

  const getPledgeLabel = () => {
    if (!receipt) return 'Not pledged';
    if (receipt.redeemedAt) return 'Redeemed';
    if (receipt.isPledged) return 'Pledged';
    return 'Not pledged';
  };

  const handleShare = async () => {
    if (!receipt) return;

    try {
      setSharing(true);
      await Share.share({
        title: `eNWR — ${receipt.receiptNumber}`,
        message: [
          `Electronic Warehouse Receipt`,
          `Receipt: ${receipt.receiptNumber}`,
          `Status: ${receipt.status}`,
          `Commodity: ${receipt.lot?.commodityName || 'N/A'}`,
          `Weight: ${receipt.lot?.currentWeightKg ? formatWeight(receipt.lot.currentWeightKg) : 'N/A'}`,
          `Facility: ${receipt.facility?.name || 'N/A'}`,
          `Issued: ${formatDate(receipt.createdAt)}`,
          receipt.isPledged ? `Pledged to: ${receipt.pledgedTo || 'N/A'}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      console.error('[Receipt Share] Error:', err);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.loadingHero}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>Loading receipt...</Text>
            <Text style={styles.loadingSub}>Fetching latest eNWR details</Text>
          </LinearGradient>
        </View>
      </>
    );
  }

  if (!receipt) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyScreen}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <Ionicons name="document-outline" size={52} color="#C4CBD3" />
          <Text style={styles.emptyTitle}>Receipt not found</Text>
          <Text style={styles.emptyText}>
            We could not load this warehouse receipt.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()} activeOpacity={0.84}>
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const timelineSteps = [
    {
      label: 'Receipt Issued',
      date: receipt.createdAt,
      done: true,
      icon: 'document-text-outline' as const,
      meta: null,
    },
    {
      label: 'Pledged',
      date: receipt.pledgedAt,
      done: receipt.isPledged,
      icon: 'lock-closed-outline' as const,
      meta: receipt.pledgedTo ? `To: ${receipt.pledgedTo}` : null,
    },
    {
      label: 'Redeemed',
      date: receipt.redeemedAt,
      done: !!receipt.redeemedAt,
      icon: 'lock-open-outline' as const,
      meta: null,
    },
    ...(receipt.expiresAt
      ? [
          {
            label: 'Expires',
            date: receipt.expiresAt,
            done: new Date(receipt.expiresAt) < new Date(),
            icon: 'time-outline' as const,
            meta: null,
          },
        ]
      : []),
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.header}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>eNWR Receipt</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {receipt.receiptNumber}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.shareIconBtn}
              onPress={handleShare}
              activeOpacity={0.82}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaChip}>
              <Ionicons name="calendar-outline" size={13} color="#D1FAE5" />
              <Text style={styles.headerMetaText}>Issued {formatDate(receipt.createdAt)}</Text>
            </View>

            <View style={styles.headerMetaChip}>
              <Ionicons
                name={receipt.isPledged ? 'lock-closed-outline' : 'shield-checkmark-outline'}
                size={13}
                color="#D1FAE5"
              />
              <Text style={styles.headerMetaText}>{getPledgeLabel()}</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.qrCard}>
            <View style={styles.qrFrame}>
              <QRCode
                value={receipt.receiptNumber}
                size={176}
                backgroundColor="#FFFFFF"
                color="#15202B"
              />
            </View>

            <Text style={styles.receiptEyebrow}>Electronic Warehouse Receipt</Text>
            <Text style={styles.receiptNumber}>{receipt.receiptNumber}</Text>

            <View style={styles.statusRow}>
              <StatusChip status={receipt.status} size="md" />
              {receipt.isNegotiable && (
                <StatusChip status="ACTIVE" size="md" label="Negotiable" />
              )}
            </View>

            <Text style={styles.qrHint}>
              Scan this QR code to verify receipt identity and receipt number.
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>STATUS</Text>
              <Text style={styles.summaryValue}>{receipt.status}</Text>
            </View>

            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>PLEDGE</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color: receipt.isPledged ? UI.warning : UI.success,
                  },
                ]}
              >
                {getPledgeLabel()}
              </Text>
            </View>
          </View>

          {receipt.lot && (
            <TouchableOpacity
              style={styles.section}
              onPress={() => router.push(`/lots/${receipt.lot!.id}`)}
              activeOpacity={0.82}
            >
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Lot Details</Text>
                <Text style={styles.linkHint}>View lot</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Lot Number</Text>
                <Text style={[styles.detailValue, styles.detailValueStrong]}>
                  {receipt.lot.lotNumber}
                </Text>
              </View>

              {receipt.lot.commodityName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Commodity</Text>
                  <Text style={styles.detailValue}>{receipt.lot.commodityName}</Text>
                </View>
              )}

              {receipt.lot.intakeWeightKg !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intake Weight</Text>
                  <Text style={styles.detailValue}>{formatWeight(receipt.lot.intakeWeightKg)}</Text>
                </View>
              )}

              {receipt.lot.currentWeightKg !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Weight</Text>
                  <Text style={styles.detailValue}>{formatWeight(receipt.lot.currentWeightKg)}</Text>
                </View>
              )}

              {receipt.lot.bagCount !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bags</Text>
                  <Text style={styles.detailValue}>{receipt.lot.bagCount}</Text>
                </View>
              )}

              {receipt.lot.qualityGrade && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grade</Text>
                  <Text style={styles.detailValue}>{receipt.lot.qualityGrade}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {receipt.facility && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Facility</Text>
              <Text style={styles.facilityName}>{receipt.facility.name}</Text>
              <Text style={styles.facilityMeta}>
                {[receipt.facility.city, receipt.facility.state].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
          )}

          {receipt.depositor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Depositor</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{receipt.depositor.fullName}</Text>
              </View>
              {receipt.depositor.phone ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{receipt.depositor.phone}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>

            {timelineSteps.map((step, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: step.done ? UI.forest : '#EEF1EA',
                      },
                    ]}
                  >
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={step.done ? '#FFF' : '#97A2AE'}
                    />
                  </View>

                  {idx < timelineSteps.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      { color: step.done ? UI.text : UI.textSoft },
                    ]}
                  >
                    {step.label}
                  </Text>

                  {step.date ? (
                    <Text style={styles.timelineDate}>{formatDate(step.date)}</Text>
                  ) : (
                    <Text style={styles.timelinePending}>Not available yet</Text>
                  )}

                  {step.meta ? (
                    <Text style={styles.timelineMeta}>{step.meta}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 96 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.84}
            disabled={sharing}
          >
            <Ionicons name="share-outline" size={20} color={UI.forest} />
            <Text style={styles.shareBtnText}>
              {sharing ? 'Sharing...' : 'Share Receipt'}
            </Text>
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

  loadingWrap: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  loadingHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },

  loadingSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 6,
  },

  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: UI.bg,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
    marginTop: 14,
  },

  emptyText: {
    fontSize: 13,
    color: UI.textSoft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  emptyBtn: {
    marginTop: 18,
    backgroundColor: UI.forest,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },

  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 22,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },

  heroGlowA: {
    position: 'absolute',
    top: -70,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  heroGlowB: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  shareIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.66)',
    marginTop: 3,
    fontWeight: '500',
  },

  headerMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  headerMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  headerMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },

  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1EA',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },

  qrFrame: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F3EF',
  },

  receiptEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textSoft,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  receiptNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: UI.forest,
    marginTop: 6,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  qrHint: {
    fontSize: 12,
    color: UI.textSoft,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },

  summaryTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF1EA',
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: UI.textSoft,
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF1EA',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.text,
    letterSpacing: -0.1,
    marginBottom: 12,
  },

  linkHint: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.forest,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 7,
  },

  detailLabel: {
    fontSize: 13,
    color: UI.textMuted,
    flex: 1,
  },

  detailValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  detailValueStrong: {
    color: UI.forest,
    fontWeight: '800',
  },

  facilityName: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
  },

  facilityMeta: {
    fontSize: 13,
    color: UI.textMuted,
    marginTop: 4,
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },

  timelineLeft: {
    alignItems: 'center',
    width: 34,
    marginRight: 12,
  },

  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    backgroundColor: '#E8ECE5',
  },

  timelineRight: {
    flex: 1,
    paddingBottom: 14,
  },

  timelineLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  timelineDate: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
  },

  timelinePending: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
  },

  timelineMeta: {
    fontSize: 12,
    color: UI.violet,
    marginTop: 4,
    fontWeight: '700',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(246,247,243,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E9ECE6',
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D9E6DE',
    backgroundColor: '#FFFFFF',
  },

  shareBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.forest,
  },
});