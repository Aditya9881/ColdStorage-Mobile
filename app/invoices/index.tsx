/**
 * Invoice List Screen — Farmer/Buyer invoice listing
 *
 * Fetches invoices from GET /invoices with tab-based filtering.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import { useFocusEffect } from 'expo-router';

interface Invoice {
  id: string;
  invoiceNumber: string;
  facilityName?: string;
  facility?: { name: string };
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  lineItems?: any[];
}

const TABS = ['ALL', 'ISSUED', 'PAID', 'OVERDUE'] as const;
type Tab = typeof TABS[number];

export default function InvoiceListScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get<any>('/invoices?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.invoices || [];
        setInvoices(items);
      }
    } catch (err) {
      console.error('[Invoices] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [fetchInvoices])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = activeTab === 'ALL'
    ? invoices
    : invoices.filter(i => i.status === activeTab);

  const totalUnpaid = invoices
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0);

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const facilityName = item.facility?.name || item.facilityName || 'Cold Storage';
    const isOverdue = item.status === 'OVERDUE';
    const remaining = item.totalAmount - item.paidAmount;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: isOverdue ? '#FCA5A520' : colors.border }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/invoices/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.invoiceNumber, { color: colors.primary }]}>
              {item.invoiceNumber}
            </Text>
            <Text style={[styles.facilityName, { color: colors.textSecondary }]} numberOfLines={1}>
              {facilityName}
            </Text>
          </View>
          <StatusChip status={item.status} />
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.borderLight }]} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Total</Text>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
          {remaining > 0 && item.status !== 'CANCELLED' && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Balance</Text>
              <Text style={[styles.amount, { color: isOverdue ? '#DC2626' : colors.accent }]}>
                {formatCurrency(remaining)}
              </Text>
            </View>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Date</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary Banner */}
      {totalUnpaid > 0 && (
        <View style={[styles.summaryBanner, { backgroundColor: `${colors.accent}15` }]}>
          <Ionicons name="alert-circle" size={18} color={colors.accent} />
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Outstanding: <Text style={{ fontWeight: FontWeight.bold, color: colors.accent }}>{formatCurrency(totalUnpaid)}</Text>
          </Text>
        </View>
      )}

      {/* Tab Filter */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'ALL'
            ? invoices.length
            : invoices.filter(i => i.status === tab).length;

          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                !isActive && { borderColor: colors.border },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? '#FFFFFF30' : `${colors.primary}15` }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? '#FFF' : colors.primary }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Invoice List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Invoices"
            subtitle={activeTab !== 'ALL' ? `No ${activeTab.toLowerCase()} invoices found` : 'Your invoices will appear here once billing begins'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  summaryText: { fontSize: FontSize.sm, flex: 1 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  facilityName: { fontSize: FontSize.sm, marginTop: 2 },
  cardDivider: { height: 1, marginVertical: Spacing.md },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountLabel: { fontSize: FontSize.xs, marginBottom: 2 },
  amount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  dateText: { fontSize: FontSize.sm },
});
