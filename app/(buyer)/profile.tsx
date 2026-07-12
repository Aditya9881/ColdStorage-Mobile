import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const BUYER_PRIMARY = '#0F766E';
const BUYER_DARK = '#134E4A';

export default function BuyerProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Hero */}
      <LinearGradient colors={[BUYER_DARK, BUYER_PRIMARY, '#14B8A6']} style={styles.heroGradient}>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{user?.fullName}</Text>
        <Text style={styles.heroPhone}>📱 {user?.phone}</Text>
        <View style={styles.buyerBadge}>
          <Ionicons name="storefront" size={12} color={BUYER_PRIMARY} />
          <Text style={styles.buyerBadgeText}>BUYER</Text>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="cart-outline" size={22} color="#0F766E" />
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="wallet-outline" size={22} color="#0F766E" />
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="bookmark-outline" size={22} color="#0F766E" />
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statLabel}>Watchlist</Text>
        </View>
      </View>

      {/* KYC Warning Box */}
      {user?.status === 'PENDING_VERIFICATION' && (
        <View style={[styles.kycWarningBox, { backgroundColor: user.kycRejectionReason ? '#FEF2F2' : '#FFFBEB', borderColor: user.kycRejectionReason ? '#FEE2E2' : '#FEF3C7' }]}>
          <View style={styles.kycWarningHeader}>
            <Ionicons
              name={user.kycRejectionReason ? 'close-circle-outline' : 'time-outline'}
              size={20}
              color={user.kycRejectionReason ? '#DC2626' : '#D97706'}
            />
            <Text style={[styles.kycWarningTitle, { color: user.kycRejectionReason ? '#991B1B' : '#92400E' }]}>
              {user.kycRejectionReason ? 'KYC Verification Rejected' : 'KYC Verification Pending'}
            </Text>
          </View>
          <Text style={[styles.kycWarningText, { color: user.kycRejectionReason ? '#B91C1C' : '#B45309' }]}>
            {user.kycRejectionReason
              ? `Reason: ${user.kycRejectionReason}`
              : 'Our administration team is reviewing your documents. We will notify you once verified.'}
          </Text>
          {user.kycRejectionReason && (
            <TouchableOpacity
              style={styles.kycReuploadBtn}
              onPress={() => router.push('/kyc/reupload')}
            >
              <Text style={styles.kycReuploadText}>Re-upload Documents</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not set'} />
        <InfoRow icon="location-outline" label="Location" value={`${user?.city || '—'}, ${user?.state || '—'}`} />
      </View>

      {/* Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Activity</Text>
        <NavRow icon="receipt-outline" label="My Orders" onPress={() => router.push('/(buyer)/orders')} />
        <NavRow icon="bookmark-outline" label="Watchlist" onPress={() => router.push('/(buyer)/watchlist')} />
        <NavRow icon="trending-up-outline" label="Market Prices" onPress={() => router.push('/market-prices')} />
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <NavRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        <NavRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ColdStorage v2.0 • Buyer Edition</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#14B8A6" />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function NavRow({ icon, label, onPress, value }: { icon: string; label: string; onPress: () => void; value?: string }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon as any} size={20} color="#6B7280" />
      <Text style={styles.navLabel}>{label}</Text>
      {value && <Text style={styles.navValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDFA' },
  heroGradient: { alignItems: 'center', paddingTop: 48, paddingBottom: 32, paddingHorizontal: Spacing.xl },
  avatarRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', marginBottom: Spacing.md },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#FFF' },
  heroName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#FFF' },
  heroPhone: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  buyerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginTop: Spacing.md },
  buyerBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: Spacing.lg, marginTop: -20, borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  statBox: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: BUYER_PRIMARY },
  statLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  section: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#9CA3AF', marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: FontSize.xs, color: '#9CA3AF' },
  infoValue: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: '#1A1A2E' },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: Spacing.md },
  navLabel: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium, color: '#1A1A2E' },
  navValue: { fontSize: FontSize.sm, color: '#9CA3AF' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.xl, backgroundColor: '#FEE2E2', padding: Spacing.lg, borderRadius: BorderRadius.lg },
  logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#DC2626' },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: '#9CA3AF', marginVertical: Spacing.lg },
  kycWarningBox: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 8 },
  kycWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  kycWarningTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  kycWarningText: { fontSize: FontSize.sm, lineHeight: 20 },
  kycReuploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: '#DC2626', paddingVertical: 10, paddingHorizontal: 14, borderRadius: BorderRadius.md, marginTop: 4 },
  kycReuploadText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
