/**
 * SheetKosh — Book Storage Screen
 *
 * Booking form opened from Facility Detail → "Book Storage"
 * Receives facilityId + facilityName as route params.
 *
 * Fields:
 *  - Commodity (category + name)
 *  - Estimated weight + bags
 *  - Preferred date & time slot
 *  - Storage duration
 *  - Farmer note
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/Colors';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

const COMMODITY_CATEGORIES = [
  { key: 'POTATO', label: 'Potato', icon: 'leaf' },
  { key: 'ONION', label: 'Onion', icon: 'ellipse' },
  { key: 'VEGETABLES', label: 'Vegetables', icon: 'nutrition' },
  { key: 'FRUITS', label: 'Fruits', icon: 'flower' },
  { key: 'DAIRY', label: 'Dairy', icon: 'water' },
  { key: 'SEEDS', label: 'Seeds', icon: 'leaf' },
  { key: 'OTHER', label: 'Other', icon: 'cube' },
] as const;

const TIME_SLOTS = [
  { key: 'MORNING', label: 'Morning', sub: '6 AM – 12 PM', icon: 'sunny-outline' },
  { key: 'AFTERNOON', label: 'Afternoon', sub: '12 PM – 5 PM', icon: 'partly-sunny-outline' },
  { key: 'EVENING', label: 'Evening', sub: '5 PM – 9 PM', icon: 'moon-outline' },
] as const;

export default function BookStorageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ facilityId: string; facilityName: string }>();
  const { facilityId, facilityName } = params;

  // Form state
  const [category, setCategory] = useState('');
  const [commodityName, setCommodityName] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [estimatedBags, setEstimatedBags] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [storageDuration, setStorageDuration] = useState('');
  const [farmerNote, setFarmerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date helpers
  const today = new Date();
  const quickDates = [
    { label: 'Tomorrow', date: new Date(today.getTime() + 86400000) },
    { label: 'In 2 days', date: new Date(today.getTime() + 2 * 86400000) },
    { label: 'In 3 days', date: new Date(today.getTime() + 3 * 86400000) },
    { label: 'In a week', date: new Date(today.getTime() + 7 * 86400000) },
  ];

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const displayDate = (d: Date) => {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const handleSubmit = useCallback(async () => {
    // Validate
    if (!category) { setError('Select a commodity category'); hapticError(); return; }
    if (!commodityName.trim()) { setError('Enter commodity name'); hapticError(); return; }
    if (!estimatedWeight || Number(estimatedWeight) <= 0) { setError('Enter estimated weight'); hapticError(); return; }
    if (!preferredDate) { setError('Select a preferred date'); hapticError(); return; }

    setError('');
    setLoading(true);
    hapticLight();

    try {
      const payload: any = {
        facilityId,
        commodityCategory: category,
        commodityName: commodityName.trim(),
        estimatedWeightKg: Number(estimatedWeight),
        preferredDate,
      };
      if (estimatedBags) payload.estimatedBags = Number(estimatedBags);
      if (timeSlot) payload.preferredSlot = timeSlot;
      if (storageDuration) payload.storageDuration = Number(storageDuration);
      if (farmerNote.trim()) payload.farmerNote = farmerNote.trim();

      const res = await api.post<any>('/bookings', payload);
      if (res.success && res.data) {
        hapticSuccess();
        Alert.alert(
          'Booking Created!',
          `Your booking #${res.data.bookingNumber} has been submitted. You'll receive confirmation shortly.`,
          [
            {
              text: 'View Booking',
              onPress: () => router.replace(`/booking/${res.data.id}`),
            },
            {
              text: 'Back to Home',
              onPress: () => router.replace('/(tabs)'),
            },
          ],
        );
      } else {
        setError(res.error?.message || 'Failed to create booking');
        hapticError();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [category, commodityName, estimatedWeight, estimatedBags, preferredDate, timeSlot, storageDuration, farmerNote, facilityId, router]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Book Storage</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {facilityName || 'Cold Storage Facility'}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="calendar" size={22} color="#FBBF24" />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ─── Commodity Category ─── */}
          <Text style={styles.sectionTitle}>What are you storing?</Text>
          <View style={styles.chipGrid}>
            {COMMODITY_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, category === c.key && styles.chipActive]}
                onPress={() => { setCategory(c.key); hapticLight(); }}
              >
                <Ionicons name={c.icon as any} size={16} color={category === c.key ? '#FFF' : '#6B7280'} />
                <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Commodity name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Commodity Name *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                value={commodityName}
                onChangeText={setCommodityName}
                placeholder="e.g. Aloo (Chandramukhi)"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Weight & Bags */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1.5 }]}>
              <Text style={styles.label}>Estimated Weight (Kg) *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="scale-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  value={estimatedWeight}
                  onChangeText={setEstimatedWeight}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Bags (optional)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  value={estimatedBags}
                  onChangeText={setEstimatedBags}
                  placeholder="e.g. 100"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* ─── Preferred Date ─── */}
          <Text style={styles.sectionTitle}>When do you want to deliver?</Text>
          <View style={styles.dateGrid}>
            {quickDates.map(qd => {
              const ds = formatDate(qd.date);
              return (
                <TouchableOpacity
                  key={ds}
                  style={[styles.dateChip, preferredDate === ds && styles.dateChipActive]}
                  onPress={() => { setPreferredDate(ds); hapticLight(); }}
                >
                  <Text style={[styles.dateChipLabel, preferredDate === ds && styles.dateChipLabelActive]}>
                    {qd.label}
                  </Text>
                  <Text style={[styles.dateChipSub, preferredDate === ds && { color: '#D1FAE5' }]}>
                    {displayDate(qd.date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Manual date input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Or enter date (YYYY-MM-DD)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                value={preferredDate}
                onChangeText={setPreferredDate}
                placeholder="2026-07-15"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* ─── Time Slot ─── */}
          <Text style={styles.sectionTitle}>Preferred Time Slot</Text>
          <View style={styles.slotRow}>
            {TIME_SLOTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.slotCard, timeSlot === s.key && styles.slotCardActive]}
                onPress={() => { setTimeSlot(s.key); hapticLight(); }}
              >
                <Ionicons name={s.icon as any} size={22} color={timeSlot === s.key ? '#2D6A4F' : '#9CA3AF'} />
                <Text style={[styles.slotLabel, timeSlot === s.key && styles.slotLabelActive]}>{s.label}</Text>
                <Text style={styles.slotSub}>{s.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── Duration ─── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Storage Duration (days, optional)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="time-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                value={storageDuration}
                onChangeText={setStorageDuration}
                placeholder="e.g. 90"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* ─── Note ─── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note for facility (optional)</Text>
            <View style={[styles.inputRow, { alignItems: 'flex-start' }]}>
              <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" style={{ marginTop: 4 }} />
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={farmerNote}
                onChangeText={setFarmerNote}
                placeholder="Any special instructions..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#2D6A4F', '#40916C']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.submitText}>Confirm Booking</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAF7' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1, fontWeight: '500' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12, marginTop: 8 },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFF' },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  row: { flexDirection: 'row', gap: 12 },

  // Date chips
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dateChip: {
    flex: 1, minWidth: '45%', padding: 12, borderRadius: 12,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  dateChipActive: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  dateChipLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  dateChipLabelActive: { color: '#FFF' },
  dateChipSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Time slots
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  slotCard: {
    flex: 1, alignItems: 'center', gap: 4, padding: 14, borderRadius: 12,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  slotCardActive: { borderColor: '#2D6A4F', backgroundColor: '#F0FFF4' },
  slotLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  slotLabelActive: { color: '#2D6A4F' },
  slotSub: { fontSize: 10, color: '#9CA3AF' },

  // Submit
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', ...Shadows.md },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
