/**
 * Invoice Detail Screen — Full invoice view with line items + payment action
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useColorScheme, Alert, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
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

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await api.get<any>(`/invoices/${id}`);
      if (res.success && res.data) {
        setInvoice(res.data);
      }
    } catch (err) {
      console.error('[Invoice Detail] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchInvoice();
    }, [fetchInvoice])
  );

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      await Share.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        message: `Invoice ${invoice.invoiceNumber}\nTotal: ${formatCurrency(invoice.totalAmount)}\nStatus: ${invoice.status}\nFacility: ${invoice.facility?.name || 'N/A'}`,
      });
    } catch {}
  };

  const handlePayment = () => {
    if (!invoice) return;
    Alert.alert(
      'Make Payment',
      `Pay ${formatCurrency(invoice.totalAmount - invoice.paidAmount)} for invoice ${invoice.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay via Razorpay',
          onPress: () => {
            // Razorpay integration placeholder
            Alert.alert('Payment Gateway', 'Razorpay payment flow will be initiated here. This requires the Razorpay SDK integration.');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Invoice not found</Text>
      </View>
    );
  }

  const remaining = invoice.totalAmount - invoice.paidAmount;
  const canPay = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && remaining > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Invoice Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerLabel}>INVOICE</Text>
              <Text style={styles.headerNumber}>{invoice.invoiceNumber}</Text>
            </View>
            <StatusChip status={invoice.status} size="md" />
          </View>
          <View style={styles.headerDetails}>
            <View style={styles.headerDetail}>
              <Text style={styles.headerDetailLabel}>Issued</Text>
              <Text style={styles.headerDetailValue}>{formatDate(invoice.createdAt)}</Text>
            </View>
            {invoice.dueDate && (
              <View style={styles.headerDetail}>
                <Text style={styles.headerDetailLabel}>Due</Text>
                <Text style={styles.headerDetailValue}>{formatDate(invoice.dueDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Facility Info */}
        {invoice.facility && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>FACILITY</Text>
            <Text style={[styles.facilityName, { color: colors.text }]}>{invoice.facility.name}</Text>
            {invoice.facility.city && (
              <Text style={[styles.facilityAddress, { color: colors.textSecondary }]}>
                {[invoice.facility.addressLine1, invoice.facility.city].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Lot Reference */}
        {invoice.lot && (
          <TouchableOpacity
            style={[styles.section, styles.lotRef, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/lots/${invoice.lot!.id}`)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>LINKED LOT</Text>
              <Text style={[styles.lotNumber, { color: colors.primary }]}>{invoice.lot.lotNumber}</Text>
              {invoice.lot.commodityName && (
                <Text style={[styles.facilityAddress, { color: colors.textSecondary }]}>{invoice.lot.commodityName}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Line Items */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>LINE ITEMS</Text>
          {(invoice.lineItems || []).map((item, idx) => (
            <View key={item.id || idx} style={[styles.lineItem, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineDesc, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.lineMeta, { color: colors.textTertiary }]}>
                  {item.quantity} × {formatCurrency(item.rate)}
                </Text>
              </View>
              <Text style={[styles.lineAmount, { color: colors.text }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={[styles.totalsSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                  Tax ({(invoice.taxRate * 100).toFixed(0)}%)
                </Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(invoice.totalAmount)}</Text>
            </View>
            {invoice.paidAmount > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: '#059669' }]}>Paid</Text>
                  <Text style={[styles.totalValue, { color: '#059669' }]}>- {formatCurrency(invoice.paidAmount)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: invoice.status === 'OVERDUE' ? '#DC2626' : colors.accent }]}>
                    Balance Due
                  </Text>
                  <Text style={[styles.totalValue, { color: invoice.status === 'OVERDUE' ? '#DC2626' : colors.accent, fontWeight: FontWeight.bold }]}>
                    {formatCurrency(remaining)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>NOTES</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.shareBtn, { borderColor: colors.border }]} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share</Text>
        </TouchableOpacity>
        {canPay && (
          <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.primary }]} onPress={handlePayment} activeOpacity={0.8}>
            <Ionicons name="card-outline" size={20} color="#FFF" />
            <Text style={styles.payBtnText}>Pay {formatCurrency(remaining)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.md, marginTop: Spacing.sm },
  scrollContent: { paddingBottom: 100 },
  headerCard: {
    padding: Spacing.xl,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLabel: { fontSize: FontSize.xs, color: '#FFFFFF80', fontWeight: FontWeight.semibold, letterSpacing: 1 },
  headerNumber: { fontSize: FontSize.xl, color: '#FFFFFF', fontWeight: FontWeight.bold, marginTop: 2 },
  headerDetails: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.xxl },
  headerDetail: {},
  headerDetailLabel: { fontSize: FontSize.xs, color: '#FFFFFF70', marginBottom: 2 },
  headerDetailValue: { fontSize: FontSize.sm, color: '#FFFFFF', fontWeight: FontWeight.semibold },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 1, marginBottom: Spacing.sm },
  facilityName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  facilityAddress: { fontSize: FontSize.sm, marginTop: 2 },
  lotRef: { flexDirection: 'row', alignItems: 'center' },
  lotNumber: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  lineDesc: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  lineMeta: { fontSize: FontSize.sm, marginTop: 2 },
  lineAmount: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  totalsSection: { borderTopWidth: 1, marginTop: Spacing.sm, paddingTop: Spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: FontSize.sm },
  totalValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  grandTotal: { marginTop: Spacing.sm, paddingTop: Spacing.sm },
  grandTotalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  grandTotalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  notesText: { fontSize: FontSize.sm, lineHeight: 20 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  payBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
});
