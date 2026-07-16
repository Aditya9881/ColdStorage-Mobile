/**
 * Invoice Detail Screen — Premium full invoice view with line items + payment action
 *
 * Updated:
 * - Back button matches invoice list screen (icon only)
 * - Header layout aligned with list screen
 * - Cleaner centered title/subtitle
 * - Better hero spacing and balance
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import StatusChip from '@/components/ui/StatusChip';

interface LineItem {
  id: string;
  description: string;
  commodity?: string;
  weightKg?: number;
  ratePerKgPerDay?: number;
  days?: number;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  facility?: { id: string; name: string; addressLine1?: string; city?: string };
  depositor?: { id: string; fullName: string; phone: string };
  lot?: { id: string; lotNumber: string; commodityName?: string };
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  paidAt: string | null;
  notes?: string;
}

const UI = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  text: '#1B2230',
  textMuted: '#6F7785',
  textSoft: '#9AA3AF',
  border: '#E9E4DB',
  borderSoft: '#F1ECE4',
  forest: '#2F7654',
  forestDeep: '#276847',
  forestLight: '#3B8A64',
  success: '#159A63',
  successSoft: '#ECFDF5',
  warning: '#D8A23C',
  warningSoft: '#FBF4E7',
  danger: '#D94B4B',
  dangerSoft: '#FEF2F2',
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/invoices/${id}`);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setInvoice(null);
      }
    } catch (err) {
      console.error('[Invoice Detail] Error:', err);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchInvoice();
    }, [fetchInvoice])
  );

  const formatCurrency = (amount: number | undefined | null) =>
    `₹${(amount ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      setSharing(true);
      await Share.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        message: [
          `Invoice ${invoice.invoiceNumber}`,
          `Total: ${formatCurrency(invoice.totalAmount)}`,
          `Paid: ${formatCurrency(invoice.paidAmount)}`,
          `Status: ${invoice.status}`,
          `Facility: ${invoice.facility?.name || 'N/A'}`,
          `Due: ${formatDate(invoice.dueDate)}`,
        ].join('\n'),
      });
    } catch (err) {
      console.error('[Invoice Share] Error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handlePayment = () => {
    if (!invoice) return;

    const remaining = invoice.totalAmount - invoice.paidAmount;

    Alert.alert(
      'Make Payment',
      `Pay ${formatCurrency(remaining)} for invoice ${invoice.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay via Razorpay',
          onPress: () => {
            Alert.alert(
              'Payment Gateway',
              'Razorpay payment flow will be initiated here. This requires the Razorpay SDK integration.'
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <LinearGradient colors={[UI.forestDeep, UI.forest, UI.forestLight]} style={styles.loadingHero}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>Loading invoice...</Text>
            <Text style={styles.loadingSub}>Fetching invoice details</Text>
          </LinearGradient>
        </View>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyScreen}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <Ionicons name="document-text-outline" size={50} color="#C8CDD3" />
          <Text style={styles.emptyTitle}>Invoice not found</Text>
          <Text style={styles.emptyText}>
            We could not load this invoice right now.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()} activeOpacity={0.84}>
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const remaining = invoice.totalAmount - invoice.paidAmount;
  const canPay =
    invoice.status !== 'PAID' &&
    invoice.status !== 'CANCELLED' &&
    remaining > 0;

  const isOverdue = invoice.status === 'OVERDUE';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient
          colors={[UI.forestDeep, UI.forest, UI.forestLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerGlow} />

          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.82}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Invoice</Text>
              <Text style={styles.headerSubtitle}>Billing details and payment status</Text>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.82}
              style={styles.iconButton}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="share-outline" size={19} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>INVOICE NUMBER</Text>
                <Text style={styles.heroNumber}>{invoice.invoiceNumber}</Text>
              </View>
              <StatusChip status={invoice.status} size="md" />
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaBox}>
                <Text style={styles.heroMetaLabel}>Issued</Text>
                <Text style={styles.heroMetaValue}>{formatDate(invoice.createdAt)}</Text>
              </View>

              <View style={styles.heroMetaBox}>
                <Text style={styles.heroMetaLabel}>Due</Text>
                <Text style={[styles.heroMetaValue, isOverdue && { color: '#FFE08A' }]}>
                  {formatDate(invoice.dueDate)}
                </Text>
              </View>

              <View style={styles.heroMetaBox}>
                <Text style={styles.heroMetaLabel}>Balance</Text>
                <Text style={styles.heroMetaValue}>{formatCurrency(remaining)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.totalAmount)}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>PAID</Text>
              <Text style={[styles.summaryValue, { color: UI.success }]}>
                {formatCurrency(invoice.paidAmount)}
              </Text>
            </View>
          </View>

          {invoice.facility && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Facility</Text>
              <Text style={styles.primaryText}>{invoice.facility.name}</Text>
              <Text style={styles.secondaryText}>
                {[invoice.facility.addressLine1, invoice.facility.city].filter(Boolean).join(', ') || '—'}
              </Text>
            </View>
          )}

          {invoice.depositor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Depositor</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{invoice.depositor.fullName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{invoice.depositor.phone}</Text>
              </View>
            </View>
          )}

          {invoice.lot && (
            <TouchableOpacity
              style={[styles.section, styles.linkCard]}
              onPress={() => router.push(`/lots/${invoice.lot!.id}`)}
              activeOpacity={0.82}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Linked Lot</Text>
                <Text style={[styles.primaryText, { color: UI.forest }]}>{invoice.lot.lotNumber}</Text>
                {invoice.lot.commodityName ? (
                  <Text style={styles.secondaryText}>{invoice.lot.commodityName}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A5AFB8" />
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items</Text>

            {(invoice.lineItems || []).map((item, idx) => (
              <View
                key={item.id || idx}
                style={[
                  styles.lineItem,
                  idx > 0 && styles.lineItemBorder,
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.lineDesc}>{item.description}</Text>

                  <Text style={styles.lineMeta}>
                    {item.quantity} × {formatCurrency(item.rate)}
                    {item.days ? ` · ${item.days} days` : ''}
                    {item.weightKg ? ` · ${item.weightKg} kg` : ''}
                  </Text>

                  {item.commodity ? (
                    <Text style={styles.lineSubMeta}>{item.commodity}</Text>
                  ) : null}
                </View>

                <Text style={styles.lineAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
              </View>

              {invoice.taxAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Tax ({(invoice.taxRate * 100).toFixed(0)}%)
                  </Text>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.totalBreak]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(invoice.totalAmount)}</Text>
              </View>

              {invoice.paidAmount > 0 && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: UI.success }]}>Paid</Text>
                    <Text style={[styles.totalValue, { color: UI.success }]}>
                      - {formatCurrency(invoice.paidAmount)}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text
                      style={[
                        styles.totalLabel,
                        { color: isOverdue ? UI.danger : UI.warning, fontWeight: '700' },
                      ]}
                    >
                      Balance Due
                    </Text>
                    <Text
                      style={[
                        styles.totalValue,
                        { color: isOverdue ? UI.danger : UI.warning, fontWeight: '800' },
                      ]}
                    >
                      {formatCurrency(remaining)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {invoice.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </View>
          ) : null}

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.82}
            disabled={sharing}
          >
            <Ionicons name="share-outline" size={20} color={UI.forest} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>

          {canPay && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={handlePayment}
              activeOpacity={0.86}
            >
              <Ionicons name="card-outline" size={20} color="#FFF" />
              <Text style={styles.payBtnText}>Pay {formatCurrency(remaining)}</Text>
            </TouchableOpacity>
          )}
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
    color: 'rgba(255,255,255,0.68)',
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
    paddingTop: Platform.OS === 'ios' ? 62 : 22,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    right: -36,
    top: -18,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroEyebrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '700',
    letterSpacing: 1,
  },

  heroNumber: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  heroMetaBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
  },

  heroMetaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.64)',
    fontWeight: '600',
    marginBottom: 4,
  },

  heroMetaValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    marginTop: 2,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.borderSoft,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: UI.textSoft,
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: UI.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.textSoft,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: UI.text,
  },

  secondaryText: {
    fontSize: 13,
    color: UI.textMuted,
    marginTop: 4,
    lineHeight: 19,
  },

  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 6,
  },

  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: UI.textMuted,
  },

  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: UI.text,
  },

  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },

  lineItemBorder: {
    borderTopWidth: 1,
    borderTopColor: UI.borderSoft,
  },

  lineDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.text,
    lineHeight: 20,
  },

  lineMeta: {
    fontSize: 12,
    color: UI.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  lineSubMeta: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
  },

  lineAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text,
  },

  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: UI.border,
    marginTop: 6,
    paddingTop: 12,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },

  totalLabel: {
    fontSize: 13,
    color: UI.textMuted,
  },

  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text,
  },

  totalBreak: {
    marginTop: 6,
    paddingTop: 8,
  },

  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
  },

  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.forest,
  },

  notesText: {
    fontSize: 13,
    color: UI.textMuted,
    lineHeight: 20,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: 'rgba(247,245,240,0.98)',
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D9E3DC',
    backgroundColor: '#FFFFFF',
    minHeight: 54,
  },

  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: UI.forest,
  },

  payBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: UI.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: UI.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },

  payBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});