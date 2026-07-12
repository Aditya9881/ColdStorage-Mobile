/**
 * Settings Screen — Language, notifications, theme, and app info
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, useColorScheme, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';
import { storage } from '@/lib/storage';
import Constants from 'expo-constants';

type Language = 'en' | 'hi';

interface NotifPrefs {
  temperatureAlerts: boolean;
  orderUpdates: boolean;
  priceAlerts: boolean;
  promotions: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

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
      if (lang === 'hi' || lang === 'en') setLanguage(lang);

      const prefs = await storage.getItem('notification_prefs');
      if (prefs) setNotifPrefs(JSON.parse(prefs));
    } catch {}
  };

  const saveLanguage = async (lang: Language) => {
    setLanguage(lang);
    await storage.setItem('app_language', lang);
    Alert.alert(
      lang === 'hi' ? 'भाषा बदली गई' : 'Language Changed',
      lang === 'hi' ? 'हिंदी में अब ऐप दिखेगा। कुछ बदलाव के लिए ऐप रीस्टार्ट करें।' : 'App language set to English. Some changes may require restart.',
    );
  };

  const toggleNotif = async (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await storage.setItem('notification_prefs', JSON.stringify(updated));
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear locally cached data. Your account data is safe.', [
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
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Language */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>LANGUAGE / भाषा</Text>
        <TouchableOpacity
          style={[
            styles.langOption,
            language === 'en' && { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
            { borderColor: language === 'en' ? colors.primary : colors.border },
          ]}
          onPress={() => saveLanguage('en')}
          activeOpacity={0.7}
        >
          <Text style={[styles.langFlag]}>🇬🇧</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.langName, { color: colors.text }]}>English</Text>
            <Text style={[styles.langDesc, { color: colors.textTertiary }]}>Default language</Text>
          </View>
          {language === 'en' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.langOption,
            language === 'hi' && { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
            { borderColor: language === 'hi' ? colors.primary : colors.border },
          ]}
          onPress={() => saveLanguage('hi')}
          activeOpacity={0.7}
        >
          <Text style={[styles.langFlag]}>🇮🇳</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.langName, { color: colors.text }]}>हिंदी</Text>
            <Text style={[styles.langDesc, { color: colors.textTertiary }]}>Hindi</Text>
          </View>
          {language === 'hi' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Notification Preferences */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>NOTIFICATIONS</Text>
        <SettingToggle
          icon="thermometer-outline"
          iconColor="#DC2626"
          label="Temperature Alerts"
          subtitle="Get notified about temperature anomalies"
          value={notifPrefs.temperatureAlerts}
          onToggle={() => toggleNotif('temperatureAlerts')}
          colors={colors}
        />
        <SettingToggle
          icon="receipt-outline"
          iconColor="#D97706"
          label="Order Updates"
          subtitle="Order approvals, dispatch, and delivery"
          value={notifPrefs.orderUpdates}
          onToggle={() => toggleNotif('orderUpdates')}
          colors={colors}
        />
        <SettingToggle
          icon="trending-up-outline"
          iconColor="#059669"
          label="Mandi Price Alerts"
          subtitle="Daily price updates for your commodities"
          value={notifPrefs.priceAlerts}
          onToggle={() => toggleNotif('priceAlerts')}
          colors={colors}
        />
        <SettingToggle
          icon="megaphone-outline"
          iconColor="#7C3AED"
          label="Promotions"
          subtitle="Special offers and announcements"
          value={notifPrefs.promotions}
          onToggle={() => toggleNotif('promotions')}
          colors={colors}
        />
      </View>

      {/* App Info */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>APP</Text>
        <SettingRow
          icon="information-circle-outline"
          label="Version"
          value={appVersion}
          colors={colors}
        />
        <SettingRow
          icon="document-text-outline"
          label="Privacy Policy"
          onPress={() => Linking.openURL('https://coldstorage.in/privacy')}
          colors={colors}
          showArrow
        />
        <SettingRow
          icon="help-circle-outline"
          label="Help & Support"
          onPress={() => Linking.openURL('https://coldstorage.in/support')}
          colors={colors}
          showArrow
        />
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.dangerRow} onPress={handleClearCache}>
          <Ionicons name="trash-outline" size={20} color="#D97706" />
          <Text style={[styles.dangerText, { color: '#D97706' }]}>Clear Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={[styles.dangerText, { color: '#DC2626' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        ColdStorage © {new Date().getFullYear()} • Made with ❤️ for Indian Farmers
      </Text>
    </ScrollView>
  );
}

// ── Helper Components ──

function SettingToggle({ icon, iconColor, label, subtitle, value, onToggle, colors }: any) {
  return (
    <View style={settingStyles.toggleRow}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={[settingStyles.toggleLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[settingStyles.toggleSub, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: `${colors.primary}60` }}
        thumbColor={value ? colors.primary : '#F4F3F4'}
      />
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, colors, showArrow }: any) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={settingStyles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[settingStyles.rowLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[settingStyles.rowValue, { color: colors.textTertiary }]}>{value}</Text>}
      {showArrow && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold,
    letterSpacing: 1, marginBottom: Spacing.md,
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  langFlag: { fontSize: 28 },
  langName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  langDesc: { fontSize: FontSize.xs, marginTop: 1 },
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dangerText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  footer: {
    fontSize: FontSize.xs, textAlign: 'center',
    marginTop: Spacing.xl, marginBottom: Spacing.xxl,
  },
});

const settingStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  toggleSub: { fontSize: FontSize.xs, marginTop: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowLabel: { fontSize: FontSize.md, flex: 1 },
  rowValue: { fontSize: FontSize.sm },
});
