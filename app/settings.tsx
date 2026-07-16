/**
 * Premium Settings Screen — Language, notifications, theme, and app info
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useColorScheme,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import Constants from 'expo-constants';

type Language = 'en' | 'hi';

interface NotifPrefs {
  temperatureAlerts: boolean;
  orderUpdates: boolean;
  priceAlerts: boolean;
  promotions: boolean;
}

const UI = {
  light: {
    bg: '#F5F7F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FBF8',
    cardBorder: '#E2E9E3',
    text: '#16241D',
    textMuted: '#708078',
    textSoft: '#95A19B',
    forest: '#103E34',
    forestDeep: '#082B24',
    teal: '#0D8D8A',
    tealSoft: '#E8F9F7',
    emerald: '#17A56D',
    emeraldSoft: '#E8F7EF',
    gold: '#C88C20',
    goldSoft: '#FFF5DE',
    blue: '#2589AA',
    blueSoft: '#EAF8FC',
    purple: '#7457BE',
    purpleSoft: '#F0EBFF',
    danger: '#D94A4A',
    dangerSoft: '#FFF0F0',
    orange: '#C97717',
    orangeSoft: '#FFF2E2',
    white: '#FFFFFF',
  },
  dark: {
    bg: '#0F1513',
    surface: '#16201C',
    surfaceAlt: '#1A2621',
    cardBorder: '#24312B',
    text: '#F4F7F4',
    textMuted: '#AAB7B1',
    textSoft: '#82918B',
    forest: '#1D6B59',
    forestDeep: '#123E34',
    teal: '#2AA7A0',
    tealSoft: '#153330',
    emerald: '#44C68E',
    emeraldSoft: '#153228',
    gold: '#E3B04C',
    goldSoft: '#362B18',
    blue: '#58A8C5',
    blueSoft: '#162E36',
    purple: '#9A82E1',
    purpleSoft: '#261F39',
    danger: '#FF7B7B',
    dangerSoft: '#341D1D',
    orange: '#E89A3D',
    orangeSoft: '#362617',
    white: '#FFFFFF',
  },
};

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const theme = UI[colorScheme];

  const [language, setLanguage] = useState<Language>('en');
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    temperatureAlerts: true,
    orderUpdates: true,
    priceAlerts: true,
    promotions: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const lang = await storage.getItem('app_language');
      if (lang === 'hi' || lang === 'en') {
        setLanguage(lang);
      }

      const prefs = await storage.getItem('notification_prefs');
      if (prefs) {
        setNotifPrefs(JSON.parse(prefs));
      }
    } catch {}
  };

  const saveLanguage = async (lang: Language) => {
    setLanguage(lang);
    await storage.setItem('app_language', lang);

    Alert.alert(
      lang === 'hi' ? 'भाषा बदली गई' : 'Language Changed',
      lang === 'hi'
        ? 'हिंदी में अब ऐप दिखेगा। कुछ बदलाव के लिए ऐप रीस्टार्ट करें।'
        : 'App language set to English. Some changes may require restart.'
    );
  };

  const toggleNotif = async (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await storage.setItem('notification_prefs', JSON.stringify(updated));
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear locally cached data. Your account data is safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.deleteItem('offline_queue');
              await storage.deleteItem('last_sync_time');
              Alert.alert('Done', 'Cache cleared successfully.');
            } catch {}
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const enabledNotifCount = Object.values(notifPrefs).filter(Boolean).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient
            colors={[theme.forestDeep, theme.forest, '#087B73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View
              style={{
                height: Platform.OS === 'ios' ? 58 : 34,
              }}
            />

            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <TouchableOpacity
                  style={styles.heroIconButton}
                  activeOpacity={0.82}
                  onPress={() => router.back()}
                >
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.heroTopTitleWrap}>
                  <Text style={styles.heroTopTitle}>Settings</Text>
                </View>

                <TouchableOpacity
                  style={styles.heroIconButton}
                  activeOpacity={0.82}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.heroEyebrow}>PREFERENCES</Text>
              <Text style={styles.heroTitle}>Settings</Text>
              <Text style={styles.heroSubtitle}>
                Manage language, alerts, support, and account preferences.
              </Text>

              <View style={styles.heroSummaryStrip}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>
                    {language === 'hi' ? 'हिंदी' : 'English'}
                  </Text>
                  <Text style={styles.heroStatLabel}>LANGUAGE</Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{enabledNotifCount}</Text>
                  <Text style={styles.heroStatLabel}>ALERTS ON</Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>v{appVersion}</Text>
                  <Text style={styles.heroStatLabel}>APP VERSION</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <SectionHeader
              eyebrow="LOCALIZATION"
              title="Language"
              subtitle="Choose how you want the app to appear."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <LanguageCard
                flag="🇬🇧"
                title="English"
                subtitle="Default language"
                selected={language === 'en'}
                onPress={() => saveLanguage('en')}
                theme={theme}
              />

              <LanguageCard
                flag="🇮🇳"
                title="हिंदी"
                subtitle="Hindi"
                selected={language === 'hi'}
                onPress={() => saveLanguage('hi')}
                theme={theme}
              />
            </View>

            <SectionHeader
              eyebrow="ALERT CENTER"
              title="Notifications"
              subtitle="Control the alerts that matter most to your operations."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <PremiumToggle
                icon="thermometer-outline"
                iconColor={theme.danger}
                iconBg={theme.dangerSoft}
                label="Temperature Alerts"
                subtitle="Get notified about unusual chamber conditions"
                value={notifPrefs.temperatureAlerts}
                onToggle={() => toggleNotif('temperatureAlerts')}
                theme={theme}
                first
              />

              <PremiumToggle
                icon="receipt-outline"
                iconColor={theme.orange}
                iconBg={theme.orangeSoft}
                label="Order Updates"
                subtitle="Approvals, dispatch progress, and order activity"
                value={notifPrefs.orderUpdates}
                onToggle={() => toggleNotif('orderUpdates')}
                theme={theme}
              />

              <PremiumToggle
                icon="trending-up-outline"
                iconColor={theme.emerald}
                iconBg={theme.emeraldSoft}
                label="Mandi Price Alerts"
                subtitle="Daily market signals for your tracked commodities"
                value={notifPrefs.priceAlerts}
                onToggle={() => toggleNotif('priceAlerts')}
                theme={theme}
              />

              <PremiumToggle
                icon="megaphone-outline"
                iconColor={theme.purple}
                iconBg={theme.purpleSoft}
                label="Promotions"
                subtitle="Offers, product updates, and service announcements"
                value={notifPrefs.promotions}
                onToggle={() => toggleNotif('promotions')}
                theme={theme}
                last
              />
            </View>

            <SectionHeader
              eyebrow="ABOUT APP"
              title="Support & Information"
              subtitle="Review version details, support, and policy links."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <PremiumRow
                icon="information-circle-outline"
                iconColor={theme.blue}
                iconBg={theme.blueSoft}
                label="Version"
                value={appVersion}
                theme={theme}
                first
              />

              <PremiumRow
                icon="document-text-outline"
                iconColor={theme.teal}
                iconBg={theme.tealSoft}
                label="Privacy Policy"
                onPress={() => Linking.openURL('https://coldstorage.in/privacy')}
                theme={theme}
                showArrow
              />

              <PremiumRow
                icon="help-circle-outline"
                iconColor={theme.gold}
                iconBg={theme.goldSoft}
                label="Help & Support"
                onPress={() => Linking.openURL('https://coldstorage.in/support')}
                theme={theme}
                showArrow
                last
              />
            </View>

            <SectionHeader
              eyebrow="ACCOUNT ACTIONS"
              title="Security & Cleanup"
              subtitle="Manage local data and sign out safely."
              theme={theme}
            />

            <View
              style={[
                styles.card,
                styles.dangerCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <DangerAction
                icon="trash-outline"
                label="Clear Cache"
                subtitle="Remove local offline data and sync timestamps"
                color={theme.orange}
                bg={theme.orangeSoft}
                onPress={handleClearCache}
                theme={theme}
                first
              />

              <DangerAction
                icon="log-out-outline"
                label="Sign Out"
                subtitle="Sign out from this device securely"
                color={theme.danger}
                bg={theme.dangerSoft}
                onPress={handleLogout}
                theme={theme}
                last
              />
            </View>

            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                ColdStorage © {new Date().getFullYear()}
              </Text>
              <Text style={[styles.footerSubText, { color: theme.textSoft }]}>
                Made with care for Indian farmers
              </Text>
            </View>
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
  theme,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  theme: any;
}) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={[styles.sectionEyebrow, { color: theme.teal }]}>
        {eyebrow}
      </Text>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
        {subtitle}
      </Text>
    </View>
  );
}

function LanguageCard({
  flag,
  title,
  subtitle,
  selected,
  onPress,
  theme,
}: {
  flag: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.languageCard,
        {
          backgroundColor: selected ? `${theme.teal}12` : theme.surfaceAlt,
          borderColor: selected ? theme.teal : theme.cardBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.languageFlagWrap}>
        <Text style={styles.languageFlag}>{flag}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.languageTitle, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.languageSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.languageCheckWrap,
          {
            backgroundColor: selected ? `${theme.teal}18` : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={theme.teal} />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color={theme.textSoft} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function PremiumToggle({
  icon,
  iconColor,
  iconBg,
  label,
  subtitle,
  value,
  onToggle,
  theme,
  first,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  theme: any;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
        },
        first && { marginTop: 2 },
      ]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.cardBorder, true: `${theme.teal}70` }}
        thumbColor={value ? theme.white : '#F4F3F4'}
        ios_backgroundColor={theme.cardBorder}
      />
    </View>
  );
}

function PremiumRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  theme,
  showArrow,
  first,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  theme: any;
  showArrow?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.infoRow,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
        },
        first && { marginTop: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <Text style={[styles.infoRowLabel, { color: theme.text }]}>{label}</Text>

      {value ? (
        <Text style={[styles.infoRowValue, { color: theme.textMuted }]}>
          {value}
        </Text>
      ) : null}

      {showArrow ? (
        <Ionicons name="chevron-forward" size={17} color={theme.textSoft} />
      ) : null}
    </Wrapper>
  );
}

function DangerAction({
  icon,
  label,
  subtitle,
  color,
  bg,
  onPress,
  theme,
  first,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  onPress: () => void;
  theme: any;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.dangerAction,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
        },
        first && { marginTop: 2 },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color }]}>{label}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color={theme.textSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 42,
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

  heroTopTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTopTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  heroEyebrow: {
    marginTop: 22,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  heroSubtitle: {
    marginTop: 7,
    maxWidth: '88%',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },

  heroSummaryStrip: {
    marginTop: 22,
    minHeight: 86,
    paddingHorizontal: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  heroStatLabel: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  body: {
    paddingTop: 24,
  },

  sectionHeaderWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#173D31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  dangerCard: {
    marginBottom: 18,
  },

  languageCard: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },

  languageFlagWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginRight: 12,
  },

  languageFlag: {
    fontSize: 25,
  },

  languageTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  languageSubtitle: {
    marginTop: 3,
    fontSize: 12,
  },

  languageCheckWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  toggleRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  infoRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  dangerAction: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  rowTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },

  infoRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },

  infoRowValue: {
    marginRight: 8,
    fontSize: 13,
    fontWeight: '600',
  },

  footerWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },

  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },

  footerSubText: {
    marginTop: 4,
    fontSize: 11,
  },
});