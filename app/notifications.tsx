/**
 * SheetKosh — Premium Notifications Screen
 *
 * Features:
 * - Grouped by day (Today, Yesterday, Earlier)
 * - Mark all as read button
 * - Notification type icons with color coding
 * - Tap to mark read + navigate
 * - Empty state
 * - Skeleton loading, Error state
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, useColorScheme, Platform, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/Colors';
import { SkeletonList } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { hapticLight } from '@/lib/haptics';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  TEMPERATURE_ALERT: { icon: 'thermometer', color: '#DC2626', bg: '#FEF2F2' },
  LOT_EXPIRY_WARNING: { icon: 'time', color: '#D97706', bg: '#FFFBEB' },
  INVOICE_OVERDUE: { icon: 'receipt', color: '#DC2626', bg: '#FEF2F2' },
  CHAMBER_CAPACITY_WARNING: { icon: 'bar-chart', color: '#D97706', bg: '#FFFBEB' },
  ORDER_UPDATE: { icon: 'cart', color: '#0891B2', bg: '#ECFEFF' },
  PAYMENT_RECEIVED: { icon: 'wallet', color: '#059669', bg: '#ECFDF5' },
  SYSTEM: { icon: 'information-circle', color: '#6B7280', bg: '#F3F4F6' },
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDayGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get<any>('/notifications');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data.notifications || res.data.items || []);
        setNotifications(items.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          createdAt: n.createdAt,
        })));
      }
    } catch (err) {
      console.error('Notifications error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    hapticLight();
    try {
      await api.post('/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  // Group by day
  const sections = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    const order = ['Today', 'Yesterday', 'Earlier'];

    notifications.forEach(n => {
      const group = getDayGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });

    return order
      .filter(g => groups[g]?.length > 0)
      .map(g => ({ title: g, data: groups[g] }));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState variant="network" onRetry={fetchNotifications} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.SYSTEM;

    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          {
            backgroundColor: item.read ? colors.card : colors.primarySubtle,
            borderColor: item.read ? colors.borderLight : colors.borderFocus,
          },
        ]}
        onPress={() => {
          hapticLight();
          if (!item.read) markRead(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
            {getTimeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Mark All Read */}
      {unreadCount > 0 && (
        <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.unreadLabel, { color: colors.textSecondary }]}>
            {unreadCount} unread
          </Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markAllBtn, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{section.title}</Text>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="All Caught Up"
            subtitle="You have no notifications. We'll let you know when something important happens."
          />
        }
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  unreadLabel: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
  },
  markAllBtn: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
  },
  list: {
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notifTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D6A4F',
  },
  notifMessage: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  notifTime: {
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    fontFamily: 'Inter_400Regular',
  },
});
