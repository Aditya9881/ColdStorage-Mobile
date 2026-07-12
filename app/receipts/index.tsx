/**
 * Warehouse Receipt List — eNWR listing for farmers
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';

interface Receipt {
  id: string;
  receiptNumber: string;
  lot?: { id: string; lotNumber: string; commodityName?: string; currentWeightKg?: number };
  isNegotiable: boolean;
  isPledged: boolean;
  pledgedTo?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
}

const TABS = ['ALL', 'ACTIVE', 'PLEDGED', 'REVOKED'] as const;
type Tab = typeof TABS[number];

export default function ReceiptListScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  const fetchReceipts = useCallback(async () => {
    try {
      const res = await api.get<any>('/warehouse-receipts?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.receipts || [];
        setReceipts(items);
      }
    } catch (err) {
      console.error('[Receipts] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReceipts();
    }, [fetchReceipts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReceipts();
  }, [fetchReceipts]);

  const filtered = activeTab === 'ALL'
    ? receipts
    : receipts.filter(r => r.status === activeTab);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const commodity = item.lot?.commodityName || 'Unknown';
    const weight = item.lot?.currentWeightKg
      ? `${(item.lot.currentWeightKg / 1000).toFixed(2)} MT`
      : '—';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/receipts/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.receiptIcon}>
            <Ionicons name="qr-code" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.receiptNumber, { color: colors.primary }]}>
              {item.receiptNumber}
            </Text>
            <Text style={[styles.commodity, { color: colors.textSecondary }]} numberOfLines={1}>
              {commodity} · {weight}
            </Text>
          </View>
          <StatusChip status={item.status} />
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {item.isNegotiable && (
            <View style={[styles.negotiableBadge, { backgroundColor: `${colors.accent}15` }]}>
              <Text style={[styles.negotiableText, { color: colors.accent }]}>Negotiable</Text>
            </View>
          )}
          {item.isPledged && item.pledgedTo && (
            <View style={styles.footerItem}>
              <Ionicons name="lock-closed-outline" size={12} color="#7C3AED" />
              <Text style={[styles.footerText, { color: '#7C3AED' }]} numberOfLines={1}>
                {item.pledgedTo}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
      {/* Tab Filter */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'ALL'
            ? receipts.length
            : receipts.filter(r => r.status === tab).length;

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
                  <Text style={[styles.tabBadgeText, { color: isActive ? '#FFF' : colors.primary }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderReceipt}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-outline"
            title="No Receipts"
            subtitle="Warehouse receipts (eNWR) will appear here once generated for your stored lots"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: BorderRadius.full, minWidth: 20, alignItems: 'center',
  },
  tabBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  receiptIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  receiptNumber: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  commodity: { fontSize: FontSize.sm, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: FontSize.xs },
  negotiableBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  negotiableText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
