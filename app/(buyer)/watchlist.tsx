import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const WATCHLIST_KEY = 'buyer_watchlist';

const COMMODITY_ICON: Record<string, string> = {
  Potato: 'nutrition-outline', Onion: 'ellipse-outline', Tomato: 'ellipse',
  Apple: 'nutrition', Mango: 'leaf-outline', Garlic: 'flower-outline',
  Ginger: 'leaf', Wheat: 'sunny-outline', Rice: 'water-outline', default: 'cube-outline',
};

export default function WatchlistScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [])
  );

  async function loadWatchlist() {
    try {
      const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }

  async function removeFromWatchlist(id: string) {
    Alert.alert('Remove from Watchlist', 'Remove this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = saved.filter(item => item.id !== id);
          setSaved(updated);
          await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
        },
      },
    ]);
  }

  async function clearAll() {
    Alert.alert('Clear Watchlist', 'Remove all saved listings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          setSaved([]);
          await AsyncStorage.removeItem(WATCHLIST_KEY);
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: any }) => {
    const iconName = COMMODITY_ICON[item.lot?.commodityName] || COMMODITY_ICON.default;
    const price = Number(item.askingPricePerKg);
    const weightMT = (Number(item.lot?.currentWeightKg) / 1000).toFixed(1);
    const savedAt = item._savedAt ? new Date(item._savedAt).toLocaleDateString('en-IN') : '—';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/listing/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardIconBox}>
            <Ionicons name={iconName as any} size={22} color={BUYER_PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.commodityName}>{item.lot?.commodityName}</Text>
            <Text style={styles.locationText}>
              {item.lot?.facility?.city}, {item.lot?.facility?.state}
            </Text>
            <Text style={styles.savedDate}>Saved {savedAt}</Text>
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromWatchlist(item.id)} activeOpacity={0.7}>
            <Ionicons name="bookmark" size={20} color={BUYER_PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{price.toFixed(0)}/kg</Text>
            <Text style={styles.statLabel}>Ask Price</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weightMT} MT</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          {item.lot?.qualityGrade && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Grade {item.lot.qualityGrade}</Text>
                <Text style={styles.statLabel}>Quality</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => router.push(`/place-order/${item.id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="cart" size={16} color="#FFF" />
          <Text style={styles.buyBtnText}>Buy Now</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (saved.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🔖</Text>
        <Text style={styles.emptyTitle}>Watchlist is Empty</Text>
        <Text style={styles.emptyText}>
          Tap the bookmark icon on any listing to save it here for later.
        </Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(buyer)')}>
          <Text style={styles.browseBtnText}>Browse Listings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{saved.length} saved listings</Text>
        <TouchableOpacity onPress={clearAll}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={saved}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDFA' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDFA', paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  emptyText: { fontSize: FontSize.sm, color: '#9CA3AF', textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  browseBtn: { marginTop: Spacing.xl, backgroundColor: BUYER_PRIMARY, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg },
  browseBtnText: { color: '#FFF', fontWeight: FontWeight.bold, fontSize: FontSize.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
  headerCount: { fontSize: FontSize.sm, color: '#6B7280', fontWeight: FontWeight.medium },
  clearText: { fontSize: FontSize.sm, color: '#DC2626', fontWeight: FontWeight.semibold },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  cardIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center' },
  commodityName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1A1A2E' },
  locationText: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  savedDate: { fontSize: FontSize.xs, color: '#C4B5FD', marginTop: 2 },
  removeBtn: { padding: Spacing.sm },
  statRow: { flexDirection: 'row', backgroundColor: '#F0FDFA', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  statLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#EDE9FE', marginVertical: 4 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: BUYER_PRIMARY, padding: Spacing.md, borderRadius: BorderRadius.md },
  buyBtnText: { color: '#FFF', fontWeight: FontWeight.semibold, fontSize: FontSize.md },
});
