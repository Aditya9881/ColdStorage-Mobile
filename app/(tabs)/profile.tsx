/**
 * ColdStorage — Premium Profile Screen
 *
 * Premium redesign:
 * - Clean custom hero header
 * - Elevated profile identity card
 * - Refined KYC status module
 * - Premium info and navigation cards
 * - Warm agri-fintech visual language
 * - Auth / API flow unchanged
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { hapticLight } from '@/lib/haptics';

const MENU_ITEMS = [
  {
    icon: 'calendar-outline',
    label: 'My Bookings',
    subtitle: 'Check booking history and status',
    route: '/bookings',
    color: '#0D7A62',
    bg: '#E8F7F1',
  },
  {
    icon: 'cube-outline',
    label: 'My Lots',
    subtitle: 'Manage stored produce and inventory',
    route: '/(tabs)/inventory',
    color: '#0D8D8A',
    bg: '#E8F9F7',
  },
  {
    icon: 'receipt-outline',
    label: 'My Orders',
    subtitle: 'View approvals, dispatch, and orders',
    route: '/orders',
    color: '#2589AA',
    bg: '#EAF8FC',
  },
  {
    icon: 'document-text-outline',
    label: 'Invoices & Receipts',
    subtitle: 'Download financial documents',
    route: '/invoices',
    color: '#7457BE',
    bg: '#F0EBFF',
  },
  {
    icon: 'notifications-outline',
    label: 'Notifications',
    subtitle: 'Review alerts and updates',
    route: '/notifications',
    color: '#C97717',
    bg: '#FFF2E2',
  },
  {
    icon: 'settings-outline',
    label: 'Settings',
    subtitle: 'Language, support, and preferences',
    route: '/settings',
    color: '#60726A',
    bg: '#EEF2EE',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    subtitle: 'Get assistance for your account',
    route: '/settings',
    color: '#2B78C5',
    bg: '#EAF2FF',
  },
] as const;

const UI = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FBF8',
  forest: '#103E34',
  forestDeep: '#082B24',
  forestMid: '#0B5B4C',
  teal: '#0D8D8A',
  tealSoft: '#E8F9F7',
  emerald: '#17A56D',
  emeraldSoft: '#E8F7EF',
  gold: '#D29424',
  goldSoft: '#FFF6E1',
  blue: '#2589AA',
  blueSoft: '#EAF8FC',
  purple: '#7457BE',
  purpleSoft: '#F0EBFF',
  danger: '#D94A4A',
  dangerSoft: '#FFF0F0',
  text: '#16241D',
  textMuted: '#708078',
  textSoft: '#95A19B',
  border: '#E2E9E3',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          hapticLight();
        },
      },
    ]);
  };

  const kycStatus =
    user?.status === 'ACTIVE'
      ? 'verified'
      : user?.status === 'PENDING_VERIFICATION'
      ? 'pending'
      : user?.kycRejectionReason
      ? 'rejected'
      : 'pending';

  const location =
    [user?.city, user?.state].filter(Boolean).join(', ') || 'Location not set';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient
            colors={[UI.forestDeep, UI.forest, '#087B73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View
              style={{
                height: insets.top + 8,
              }}
            />

            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTopTitleWrap}>
                  <Text style={styles.heroTopTitle}>Profile</Text>
                </View>

                <TouchableOpacity
                  style={styles.heroIconButton}
                  activeOpacity={0.82}
                  onPress={() => {
                    router.push('/settings');
                    hapticLight();
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileIdentityRow}>
                <View style={styles.avatarWrap}>
                  <LinearGradient
                    colors={['#43D6A0', '#11A96D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {user?.fullName?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </LinearGradient>

                  {kycStatus === 'verified' && (
                    <View style={styles.verifiedOverlay}>
                      <Ionicons
                        name="shield-checkmark"
                        size={13}
                        color={UI.emerald}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.profileTextWrap}>
                  <Text style={styles.profileEyebrow}>ACCOUNT</Text>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {user?.fullName || 'Farmer'}
                  </Text>

                  <View style={styles.phoneRow}>
                    <Ionicons
                      name="call-outline"
                      size={12}
                      color="rgba(255,255,255,0.62)"
                    />
                    <Text style={styles.profilePhone}>{user?.phone || '—'}</Text>
                  </View>
                </View>

                <View style={styles.roleBadge}>
                  <Ionicons name="leaf-outline" size={12} color="#8EF0C6" />
                  <Text style={styles.roleText}>{user?.role || 'FARMER'}</Text>
                </View>
              </View>

              <View style={styles.heroMetaStrip}>
                <View style={styles.heroMetaItem}>
                  <Text style={styles.heroMetaValue}>
                    {kycStatus === 'verified'
                      ? 'Verified'
                      : kycStatus === 'rejected'
                      ? 'Rejected'
                      : 'Pending'}
                  </Text>
                  <Text style={styles.heroMetaLabel}>KYC</Text>
                </View>

                <View style={styles.heroMetaDivider} />

                <View style={styles.heroMetaItem}>
                  <Text style={styles.heroMetaValue} numberOfLines={1}>
                    {user?.uniqueId || 'Not set'}
                  </Text>
                  <Text style={styles.heroMetaLabel}>UNIQUE ID</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <SectionHeader
              eyebrow="VERIFICATION"
              title="KYC Status"
              subtitle="Your identity verification and onboarding status."
            />

            {kycStatus === 'verified' ? (
              <View style={[styles.statusCard, styles.verifiedCard]}>
                <View
                  style={[
                    styles.statusIconWrap,
                    { backgroundColor: UI.emeraldSoft },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={UI.emerald}
                  />
                </View>

                <View style={styles.statusTextWrap}>
                  <Text style={[styles.statusTitle, { color: '#086C4B' }]}>
                    KYC Verified
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: '#2B7B5D' }]}>
                    Your identity has been successfully verified.
                  </Text>
                </View>

                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={UI.emerald}
                />
              </View>
            ) : kycStatus === 'rejected' ? (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: '#FEF2F2',
                    borderColor: '#FECACA',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusIconWrap,
                    { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={UI.danger}
                  />
                </View>

                <View style={styles.statusTextWrap}>
                  <Text style={[styles.statusTitle, { color: '#991B1B' }]}>
                    KYC Rejected
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: '#B91C1C' }]}>
                    {user?.kycRejectionReason ||
                      'Please re-upload your documents.'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.fixButton}
                  activeOpacity={0.82}
                  onPress={() => {
                    router.push('/kyc/reupload');
                    hapticLight();
                  }}
                >
                  <Text style={styles.fixButtonText}>Fix</Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: '#FFF9EA',
                    borderColor: '#F5E3A9',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusIconWrap,
                    { backgroundColor: '#FFF1C7' },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={UI.gold}
                  />
                </View>

                <View style={styles.statusTextWrap}>
                  <Text style={[styles.statusTitle, { color: '#8A5A0F' }]}>
                    KYC Pending
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: '#A8721C' }]}>
                    Your documents are under review by our team.
                  </Text>
                </View>
              </View>
            )}

            <SectionHeader
              eyebrow="PERSONAL DETAILS"
              title="Account Information"
              subtitle="Key profile details linked to your ColdStorage account."
            />

            <View style={styles.card}>
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={user?.email || 'Not set'}
                iconBg={UI.blueSoft}
                iconColor={UI.blue}
                first
              />

              <Divider />

              <InfoRow
                icon="location-outline"
                label="Location"
                value={location}
                iconBg={UI.emeraldSoft}
                iconColor={UI.emerald}
              />

              <Divider />

              <InfoRow
                icon="shield-checkmark-outline"
                label="Account Status"
                value={
                  user?.status === 'ACTIVE'
                    ? 'Verified & Active'
                    : (user?.status || 'Pending').replace(/_/g, ' ')
                }
                iconBg={UI.goldSoft}
                iconColor={UI.gold}
                last
              />
            </View>

            <SectionHeader
              eyebrow="WORKSPACE"
              title="Profile Actions"
              subtitle="Open your bookings, inventory, notifications, and support."
            />

            <View style={styles.card}>
              {MENU_ITEMS.map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      router.push(item.route as any);
                      hapticLight();
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.menuIcon,
                        { backgroundColor: item.bg },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={item.color}
                      />
                    </View>

                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={UI.textSoft}
                    />
                  </TouchableOpacity>

                  {index < MENU_ITEMS.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.82}
              onPress={handleLogout}
            >
              <View style={styles.logoutIconWrap}>
                <Ionicons
                  name="log-out-outline"
                  size={17}
                  color={UI.danger}
                />
              </View>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>ColdStorage • Farmer Edition</Text>

            <View style={{ height: insets.top + 54 }} />
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  first,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        first && { marginTop: 2 },
        last && { marginBottom: 2 },
      ]}
    >
      <View
        style={[
          styles.infoIconWrap,
          iconBg ? { backgroundColor: iconBg } : null,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={17}
          color={iconColor || UI.textSoft}
        />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.canvas,
  },

  scrollContent: {
    paddingBottom: 0,
  },

  hero: {
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },

  heroGlowTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(42, 199, 171, 0.14)',
  },

  heroGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 180,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  heroContent: {
    paddingHorizontal: 16,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroTopTitleWrap: {
    flex: 1,
    justifyContent: 'center',
  },

  heroTopTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  heroIconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  profileIdentityRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    position: 'relative',
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },

  verifiedOverlay: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFF7EA',
    borderWidth: 2,
    borderColor: UI.forest,
  },

  profileTextWrap: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  profileEyebrow: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  profileName: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.45,
  },

  phoneRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  profilePhone: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    fontWeight: '600',
  },

  roleBadge: {
    minHeight: 31,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.18)',
  },

  roleText: {
    color: '#8EF0C6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  heroMetaStrip: {
    marginTop: 22,
    minHeight: 78,
    borderRadius: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  heroMetaItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  heroMetaValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  heroMetaLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroMetaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  body: {
    paddingTop: 24,
  },

  sectionHeaderWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionEyebrow: {
    color: UI.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  sectionTitle: {
    marginTop: 4,
    color: UI.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    marginTop: 5,
    color: UI.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  statusCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    minHeight: 84,
    padding: 14,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  verifiedCard: {
    backgroundColor: '#E9F8F0',
    borderColor: '#BFECCF',
  },

  statusIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  statusSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },

  fixButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: UI.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  fixButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  infoRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },

  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: UI.surfaceAlt,
  },

  infoTextWrap: {
    flex: 1,
  },

  infoLabel: {
    color: UI.textSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },

  infoValue: {
    marginTop: 4,
    color: UI.text,
    fontSize: 14,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#EDF1ED',
  },

  menuItem: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  menuTextWrap: {
    flex: 1,
    paddingRight: 10,
  },

  menuLabel: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },

  menuSubtitle: {
    marginTop: 4,
    color: UI.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  logoutButton: {
    marginHorizontal: 16,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3B4B4',
    backgroundColor: '#FFF1F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  logoutIconWrap: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE3E3',
  },

  logoutText: {
    color: '#B3262D',
    fontSize: 15,
    fontWeight: '800',
  },

  versionText: {
    marginTop: 18,
    textAlign: 'center',
    color: UI.textSoft,
    fontSize: 11,
    fontWeight: '600',
  },
});