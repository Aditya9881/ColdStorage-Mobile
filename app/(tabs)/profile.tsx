/**
 * ColdStorage — Premium Profile Screen
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Features:
 * - Gradient mesh header with grain texture
 * - Avatar with verified badge overlay
 * - Role chip (Farmer/Buyer)
 * - KYC status card with shimmer effect
 * - Info card with colored icon squares
 * - Menu items with colored rounded icon squares
 * - Warm off-white background
 * - All auth/API flow UNCHANGED
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Shadows, BorderRadius, Gradients, FontFamily } from '@/constants/Colors';
import { hapticLight } from '@/lib/haptics';

const MENU_ITEMS = [
  { icon: 'calendar-outline', label: 'My Bookings', route: '/bookings', color: '#1B5E4A', bg: '#E6F2ED' },
  { icon: 'cube-outline', label: 'My Lots', route: '/(tabs)/inventory', color: '#059669', bg: '#D1FAE5' },
  { icon: 'receipt-outline', label: 'My Orders', route: '/orders', color: '#0891B2', bg: '#CFFAFE' },
  { icon: 'document-text-outline', label: 'Invoices & Receipts', route: '/invoices', color: '#7C3AED', bg: '#EDE9FE' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', color: '#D97706', bg: '#FEF3C7' },
  { icon: 'settings-outline', label: 'Settings', route: '/settings', color: '#5F6B7A', bg: '#F0EDE8' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: '/settings', color: '#3B82F6', bg: '#DBEAFE' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); hapticLight(); } },
    ]);
  };

  const kycStatus = user?.status === 'ACTIVE' ? 'verified' :
    user?.status === 'PENDING_VERIFICATION' ? 'pending' :
    user?.kycRejectionReason ? 'rejected' : 'pending';

  return (
    <View style={s.screen}>
      {/* ── Gradient Header ── */}
      <LinearGradient colors={Gradients.mesh as any} style={s.header}>
        <View style={s.grainOverlay} />
        <View style={s.avatarRow}>
          <View style={s.avatarWrap}>
            <LinearGradient colors={['#34D399', '#10B981']} style={s.avatar}>
              <Text style={s.avatarText}>{user?.fullName?.[0]?.toUpperCase() || '?'}</Text>
            </LinearGradient>
            {kycStatus === 'verified' && (
              <View style={s.verifiedOverlay}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" />
              </View>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.headerName}>{user?.fullName || 'Farmer'}</Text>
            <View style={s.phoneRow}>
              <Ionicons name="call" size={11} color="rgba(255,255,255,0.45)" />
              <Text style={s.headerPhone}>{user?.phone || '—'}</Text>
            </View>
          </View>
          <View style={s.roleBadge}>
            <Ionicons name="leaf" size={11} color="#34D399" />
            <Text style={s.roleText}>{user?.role || 'FARMER'}</Text>
          </View>
        </View>

        {/* Unique ID strip */}
        {user?.uniqueId && (
          <View style={s.idStrip}>
            <Ionicons name="finger-print" size={13} color="#6EE7B7" />
            <Text style={s.idText}>ID: {user.uniqueId}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── KYC Status ── */}
        {kycStatus === 'verified' ? (
          <View style={s.kycVerified}>
            <View style={s.kycVerifiedIcon}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.kycTitle}>KYC Verified</Text>
              <Text style={s.kycSub}>Your identity has been verified</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
          </View>
        ) : kycStatus === 'rejected' ? (
          <View style={[s.kycBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <View style={[s.kycBannerIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.kycTitle, { color: '#991B1B' }]}>KYC Rejected</Text>
              <Text style={[s.kycSub, { color: '#B91C1C' }]}>
                {user?.kycRejectionReason || 'Please re-upload documents'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.kycFixBtn}
              onPress={() => { router.push('/kyc/reupload'); hapticLight(); }}
            >
              <Text style={s.kycFixText}>Fix</Text>
              <Ionicons name="arrow-forward" size={11} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.kycBanner, { backgroundColor: '#FBF5E8', borderColor: '#E8BE6A40' }]}>
            <View style={[s.kycBannerIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.kycTitle, { color: '#92400E' }]}>KYC Pending</Text>
              <Text style={[s.kycSub, { color: '#B45309' }]}>Under review by our team</Text>
            </View>
          </View>
        )}

        {/* ── Info Card ── */}
        <View style={s.card}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not set'} iconBg="#DBEAFE" iconColor="#3B82F6" />
          <View style={s.divider} />
          <InfoRow icon="location-outline" label="Location" value={
            [user?.city, user?.state].filter(Boolean).join(', ') || 'Not set'
          } iconBg="#D1FAE5" iconColor="#059669" />
          <View style={s.divider} />
          <InfoRow icon="shield-checkmark-outline" label="Account Status" value={
            user?.status === 'ACTIVE' ? 'Verified & Active' : (user?.status || 'Pending').replace(/_/g, ' ')
          } iconBg="#FBF5E8" iconColor="#D9A441" />
        </View>

        {/* ── Menu Items ── */}
        <View style={s.card}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => { router.push(item.route as any); hapticLight(); }}
                activeOpacity={0.65}
              >
                <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={17} color={item.color} />
                </View>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
              </TouchableOpacity>
              {i < MENU_ITEMS.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <View style={s.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
          </View>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>ColdStorage v2.0 • Farmer Edition</Text>
        <View style={{ height: Platform.OS === 'ios' ? 100 : 32 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, iconBg, iconColor }: {
  icon: string; label: string; value: string; iconBg?: string; iconColor?: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconWrap, iconBg ? { backgroundColor: iconBg } : {}]}>
        <Ionicons name={icon as any} size={15} color={iconColor || '#94A3B8'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F2' },

  // ── Header ──
  header: {
    paddingHorizontal: 20, paddingBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 16,
  },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarText: {
    fontSize: 24, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold,
  },
  verifiedOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0F3D2E',
  },
  headerName: {
    fontSize: 20, fontWeight: '800', color: '#FFF',
    fontFamily: FontFamily.extrabold, letterSpacing: -0.3,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  headerPhone: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    fontFamily: FontFamily.regular,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(52,211,153,0.12)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
  },
  roleText: {
    fontSize: 10, fontWeight: '700', color: '#6EE7B7',
    fontFamily: FontFamily.bold, letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  idStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  idText: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600',
    fontFamily: FontFamily.semibold, letterSpacing: 0.5,
  },

  scrollContent: { padding: 16 },

  // ── KYC ──
  kycVerified: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: BorderRadius.lg,
    backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 16,
    ...Shadows.sm,
  },
  kycVerifiedIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
  kycBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: 16,
    ...Shadows.sm,
  },
  kycBannerIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  kycTitle: {
    fontSize: 14, fontWeight: '700', color: '#065F46',
    fontFamily: FontFamily.bold,
  },
  kycSub: {
    fontSize: 11, color: '#5F6B7A', marginTop: 2,
    fontFamily: FontFamily.regular,
  },
  kycFixBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  kycFixText: { fontSize: 11, fontWeight: '700', color: '#FFF', fontFamily: FontFamily.bold },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: '#E8E6E1',
    ...Shadows.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 10, color: '#94A3B8', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    fontFamily: FontFamily.bold,
  },
  infoValue: {
    fontSize: 14, color: '#1A1A2E', fontWeight: '600', marginTop: 2,
    fontFamily: FontFamily.semibold,
  },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginHorizontal: 14 },

  // ── Menu ──
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: {
    flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E',
    fontFamily: FontFamily.semibold,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: BorderRadius.lg,
    backgroundColor: '#FECACA', borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  logoutIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15, fontWeight: '600', color: '#991B1B',
    fontFamily: FontFamily.semibold,
  },

  version: {
    textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 20,
    fontWeight: '500', fontFamily: FontFamily.medium,
  },
});
