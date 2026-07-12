import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING_APPROVAL: { label: 'Awaiting Farmer', color: '#D97706', bg: '#FFFBEB', icon: 'hourglass-outline' },
  APPROVED:         { label: 'Approved', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' },
  REJECTED:         { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  DISPATCHED:       { label: 'Dispatched', color: '#0891B2', bg: '#ECFEFF', icon: 'car' },
  COMPLETED:        { label: 'Completed', color: '#6B7280', bg: '#F3F4F6', icon: 'checkbox' },
  CANCELLED:        { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6', icon: 'ban' },
};

const TABS = ['All', 'Pending', 'Approved', 'Dispatched', 'Completed'];

export default function BuyerOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<any>('/orders?limit=50');
      if (res.success && res.data?.orders) setOrders(res.data.orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (activeTab === 'All') { setFiltered(orders); return; }
    const map: Record<string, string[]> = {
      Pending:    ['PENDING_APPROVAL'],
      Approved:   ['APPROVED'],
      Dispatched: ['DISPATCHED'],
      Completed:  ['COMPLETED', 'CANCELLED'],
    };
    setFiltered(orders.filter(o => map[activeTab]?.includes(o.status)));
  }, [orders, activeTab]);

  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  const renderOrder = ({ item }: { item: any }) => {
    const s = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING_APPROVAL;
    const commodity = item.listing?.lot?.commodityName || 'Unknown';
    const COMMODITY_ICON: Record<string, string> = { Potato: 'nutrition-outline', Onion: 'ellipse-outline', Tomato: 'ellipse', Apple: 'nutrition', default: 'cube-outline' };
    const iconName = COMMODITY_ICON[commodity] || COMMODITY_ICON.default;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Ionicons name={iconName as any} size={22} color="#0F766E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.commodityName}>{commodity}</Text>
            <Text style={styles.lotText}>Lot: {item.listing?.lot?.lotNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon as any} size={12} color={s.color} />
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Total Paid</Text>
            <Text style={styles.amountValue}>₹{Number(item.totalAmount).toLocaleString()}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Quantity</Text>
            <Text style={styles.amountVal2}>{Number(item.quantityKg)} kg</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Rate</Text>
            <Text style={styles.amountVal2}>₹{Number(item.agreedPricePerKg)}/kg</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            <Ionicons name="business-outline" size={11} color="#9CA3AF" /> {item.listing?.lot?.facility?.name || '—'}
          </Text>
          <Text style={styles.footerText}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
        </View>

        {item.status === 'PENDING_APPROVAL' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={14} color="#D97706" />
            <Text style={styles.pendingText}>Waiting for farmer to approve release</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={BUYER_PRIMARY} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>
            {orders.filter(o => o.status === 'PENDING_APPROVAL').length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>
            ₹{orders.filter(o => o.status === 'COMPLETED').reduce((s: number, o: any) => s + Number(o.totalAmount), 0).toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Completed Value</Text>
        </View>
      </View>

      {/* Tab Filter */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: BUYER_PRIMARY }]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && { color: '#FFF' }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BUYER_PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={48} color="#D1D5DB" style={{ marginBottom: Spacing.lg }} />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>Browse the marketplace to find and buy produce</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDFA' },
  summaryBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  summaryLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', padding: Spacing.sm, gap: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, alignItems: 'center', backgroundColor: '#F0FDFA' },
  tabText: { fontSize: 11, fontWeight: FontWeight.semibold, color: '#6B7280' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' },
  commodityName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  lotText: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F0FDFA', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  amountItem: { alignItems: 'center' },
  amountLabel: { fontSize: FontSize.xs, color: '#9CA3AF' },
  amountValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  amountVal2: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: FontSize.xs, color: '#9CA3AF' },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFFBEB', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.md },
  pendingText: { fontSize: FontSize.xs, color: '#D97706', flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: '#1A1A2E' },
  emptyText: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: Spacing.sm, textAlign: 'center' },
});
