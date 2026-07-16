import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  FontFamily,
} from '@/constants/Colors';
import { useColorScheme } from 'react-native';

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  PENDING_APPROVAL: {
    label: 'Pending',
    color: '#C27A12',
    bg: '#FFF7E7',
    icon: 'time-outline',
  },
  APPROVED: {
    label: 'Approved',
    color: '#0F8A5F',
    bg: '#EAF8F1',
    icon: 'checkmark-circle-outline',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#D14343',
    bg: '#FDECEC',
    icon: 'close-circle-outline',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: '#0D8DB3',
    bg: '#E9F9FD',
    icon: 'car-outline',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#5E6B7C',
    bg: '#F1F4F7',
    icon: 'checkbox-outline',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#7A808A',
    bg: '#F3F4F6',
    icon: 'ban-outline',
  },
};

const FILTERS = ['All', 'Pending', 'Approved', 'Dispatched', 'Completed', 'Rejected'];

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<any>('/orders?limit=30');
      if (res.success && res.data?.orders) setOrders(res.data.orders);
      else setOrders([]);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
    const approved = orders.filter(
      (o) => o.status === 'APPROVED' || o.status === 'DISPATCHED'
    ).length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return {
      total: orders.length,
      pending,
      approved,
      completed,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'All') return orders;
    if (activeFilter === 'Pending')
      return orders.filter((o) => o.status === 'PENDING_APPROVAL');
    if (activeFilter === 'Approved')
      return orders.filter((o) => o.status === 'APPROVED');
    if (activeFilter === 'Dispatched')
      return orders.filter((o) => o.status === 'DISPATCHED');
    if (activeFilter === 'Completed')
      return orders.filter((o) => o.status === 'COMPLETED');
    if (activeFilter === 'Rejected')
      return orders.filter((o) => o.status === 'REJECTED');
    return orders;
  }, [orders, activeFilter]);

  const renderOrder = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING_APPROVAL;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.82}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.commodity}>
              {item.listing?.lot?.commodityName || 'Unknown'}
            </Text>
            <Text style={styles.meta}>
              {item.listing?.lot?.lotNumber || '—'} • {Number(item.quantityKg || 0)} kg
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={13} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.amountPanel}>
          <Text style={styles.amountLabel}>Order Value</Text>
          <Text style={styles.price}>
            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.priceDetail}>
            Agreed price: ₹{Number(item.agreedPricePerKg || 0).toLocaleString('en-IN')}/kg
          </Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Ionicons name="person-outline" size={12} color="#7C8A9F" />
            <Text style={styles.infoPillText}>{item.buyer?.fullName || '—'}</Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="calendar-outline" size={12} color="#7C8A9F" />
            <Text style={styles.infoPillText}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-IN')
                : '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F4F6F3' }]}>
        <ActivityIndicator size="large" color="#14532D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={['#0D2F2A', '#14532D', '#185B4A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerGlowA} />
        <View style={{ height: Platform.OS === 'ios' ? 54 : 34 }} />

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Orders</Text>
            <Text style={styles.headerSub}>
              Track approvals, dispatches, and completed sales
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.completed}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14532D"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={30} color="#8B97A8" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Orders will appear here when buyers purchase your listed produce.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F3',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },

  headerGlowA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    right: -70,
    top: -30,
    backgroundColor: 'rgba(34,197,94,0.10)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 26,
    color: '#FFF',
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
    fontFamily: FontFamily.medium,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryValue: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: 'rgba(255,255,255,0.70)',
    fontFamily: FontFamily.medium,
  },

  filtersWrap: {
    paddingTop: 12,
  },

  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#E7ECE7',
    borderWidth: 1,
    borderColor: '#D9E0D7',
  },

  filterChipActive: {
    backgroundColor: '#14532D',
    borderColor: '#14532D',
  },

  filterChipText: {
    fontSize: 12,
    color: '#627082',
    fontWeight: '600',
    fontFamily: FontFamily.semibold,
  },

  filterChipTextActive: {
    color: '#FFF',
  },

  countRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },

  countText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontFamily: FontFamily.medium,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 32,
  },

  card: {
    backgroundColor: '#FFFEFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8E5DD',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#172B22',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  commodity: {
    fontSize: 18,
    color: '#171A2B',
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.2,
  },

  meta: {
    fontSize: 12,
    color: '#8C96A6',
    marginTop: 4,
    fontFamily: FontFamily.regular,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FontFamily.semibold,
  },

  amountPanel: {
    backgroundColor: '#F6F3EA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  amountLabel: {
    fontSize: 11,
    color: '#8C96A6',
    fontFamily: FontFamily.medium,
  },

  price: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 36,
    color: '#14532D',
    fontWeight: '800',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'] as any,
  },

  priceDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#7C8A9F',
    fontFamily: FontFamily.medium,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F5F3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  infoPillText: {
    fontSize: 11,
    color: '#7C8A9F',
    fontFamily: FontFamily.medium,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: '#E9EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 18,
    fontFamily: FontFamily.bold,
  },

  emptyText: {
    fontSize: 14,
    color: '#8C96A6',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: FontFamily.regular,
  },
});