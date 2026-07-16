/**
 * Warehouse Receipt List — Premium eNWR listing for farmers
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api-client';
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

const UI = {
  bg: '#F6F7F3',
  surface: '#FFFFFF',
  text: '#18212F',
  textMuted: '#6B7280',
  textSoft: '#9CA3AF',
  border: '#E9ECE6',
  borderSoft: '#EEF1EA',
  forest: '#2D6A4F',
  forestDeep: '#163528',
  forestMid: '#1F513B',
  successSoft: '#ECFDF5',
  violetSoft: '#F5F3FF',
  goldSoft: '#FFFBEB',
  violet: '#7C3AED',
  gold: '#D97706',
};

export default function ReceiptListScreen() {
  const router = useRouter();

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
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.error('[Receipts] Fetch error:', err);
      setReceipts([]);
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatWeight = (kg?: number) => {
    if (kg === undefined || kg === null) return '—';
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} MT`;
    return `${kg.toFixed(1)} kg`;
  };

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return receipts;
    return receipts.filter(r => r.status === activeTab);
  }, [activeTab, receipts]);

  const counts = useMemo(() => {
    return {
      ALL: receipts.length,
      ACTIVE: receipts.filter(r => r.status === 'ACTIVE').length,
      PLEDGED: receipts.filter(r => r.status === 'PLEDGED').length,
      REVOKED: receipts.filter(r => r.status === 'REVOKED').length,
    };
  }, [receipts]);

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const commodity = item.lot?.commodityName || 'Unknown commodity';
    const weight = formatWeight(item.lot?.currentWeightKg);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.82}
        onPress={() => router.push(`/receipts/${item.id}`)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.receiptIcon}>
            <Ionicons name="qr-code-outline" size={22} color={UI.forest} />
          </View>

          <View style={styles.cardTopContent}>
            <Text style={styles.receiptNumber}>{item.receiptNumber}</Text>
            <Text style={styles.commodity} numberOfLines={1}>
              {commodity}
            </Text>
            <Text style={styles.weightText}>{weight}</Text>
          </View>

          <StatusChip status={item.status} />
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Lot</Text>
            <Text style={styles.metaValue}>{item.lot?.lotNumber || '—'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.badgeRow}>
            {item.isNegotiable && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.successSoft }]}>
                <Ionicons name="swap-horizontal-outline" size={12} color={UI.forest} />
                <Text style={[styles.inlineBadgeText, { color: UI.forest }]}>Negotiable</Text>
              </View>
            )}

            {item.isPledged && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.violetSoft }]}>
                <Ionicons name="lock-closed-outline" size={12} color={UI.violet} />
                <Text style={[styles.inlineBadgeText, { color: UI.violet }]}>
                  {item.pledgedTo ? `Pledged · ${item.pledgedTo}` : 'Pledged'}
                </Text>
              </View>
            )}

            {item.expiresAt && (
              <View style={[styles.inlineBadge, { backgroundColor: UI.goldSoft }]}>
                <Ionicons name="time-outline" size={12} color={UI.gold} />
                <Text style={[styles.inlineBadgeText, { color: UI.gold }]}>
                  Expires {formatDate(item.expiresAt)}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={18} color="#A3ADB7" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingScreen}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.loadingHero}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>Loading receipts...</Text>
            <Text style={styles.loadingSub}>Fetching your latest eNWR records</Text>
          </LinearGradient>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <LinearGradient colors={[UI.forestDeep, UI.forestMid, UI.forest]} style={styles.header}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <Text style={styles.headerTitle}>Warehouse Receipts</Text>
          <Text style={styles.headerSub}>Your verified eNWR records</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{counts.ALL}</Text>
              <Text style={styles.summaryLabel}>TOTAL</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{counts.ACTIVE}</Text>
              <Text style={styles.summaryLabel}>ACTIVE</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{counts.PLEDGED}</Text>
              <Text style={styles.summaryLabel}>PLEDGED</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabWrap}>
          <FlatList
            data={TABS}
            horizontal
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
            renderItem={({ item: tab }) => {
              const isActive = activeTab === tab;
              const count = counts[tab];

              return (
                <TouchableOpacity
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </Text>

                  {count > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderReceipt}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={UI.forest}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="document-outline"
                title="No Receipts"
                subtitle="Warehouse receipts (eNWR) will appear here once generated for your stored lots"
              />
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  loadingScreen: {
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
    bottom: -65,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.64)',
    marginTop: 4,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  summaryCard: {
    minWidth: 72,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.56)',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 4,
  },

  tabWrap: {
    paddingTop: 12,
  },

  tabRow: {
    paddingHorizontal: 16,
    gap: 10,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.border,
  },

  tabActive: {
    backgroundColor: UI.forest,
    borderColor: UI.forest,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textMuted,
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  tabBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#EEF6F1',
  },

  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.forest,
  },

  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.borderSoft,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  receiptIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  cardTopContent: {
    flex: 1,
    paddingRight: 8,
  },

  receiptNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.forest,
    letterSpacing: -0.2,
  },

  commodity: {
    fontSize: 13,
    color: UI.text,
    marginTop: 4,
    fontWeight: '600',
  },

  weightText: {
    fontSize: 12,
    color: UI.textSoft,
    marginTop: 3,
    fontWeight: '500',
  },

  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F3EF',
  },

  metaBlock: {
    flex: 1,
  },

  metaLabel: {
    fontSize: 11,
    color: UI.textSoft,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  metaValue: {
    fontSize: 13,
    color: UI.text,
    fontWeight: '700',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginRight: 8,
  },

  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyWrap: {
    paddingTop: 64,
  },
});