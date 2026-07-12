import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING_APPROVAL: { label: 'Pending', color: '#D97706', bg: '#FFFBEB', icon: 'time' },
  APPROVED: { label: 'Approved', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  DISPATCHED: { label: 'Dispatched', color: '#0891B2', bg: '#ECFEFF', icon: 'car' },
  COMPLETED: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6', icon: 'checkbox' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6', icon: 'ban' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<any>('/orders?limit=30');
      if (res.success && res.data?.orders) setOrders(res.data.orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  const renderOrder = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING_APPROVAL;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.commodity, { color: colors.text }]}>
              {item.listing?.lot?.commodityName || 'Unknown'}
            </Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {item.listing?.lot?.lotNumber} • {Number(item.quantityKg)} kg
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₹{Number(item.totalAmount).toLocaleString()}
          </Text>
          <Text style={[styles.priceDetail, { color: colors.textSecondary }]}>
            @ ₹{Number(item.agreedPricePerKg)}/kg
          </Text>
        </View>
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Buyer: {item.buyer?.fullName || '—'}
          </Text>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Orders will appear here when buyers purchase your listed produce
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  commodity: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  meta: { fontSize: FontSize.xs, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cardBody: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.md },
  price: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  priceDetail: { fontSize: FontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: Spacing.md },
  footerText: { fontSize: FontSize.xs },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginTop: Spacing.lg },
  emptyText: { fontSize: FontSize.sm, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
