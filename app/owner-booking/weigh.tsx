/**
 * SheetKosh — Weighing & Storage Confirmation Screen
 *
 * Owner/staff enters actual weight, bag count, rate,
 * then confirms storage to transition booking to STORED.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api-client';
import { Shadows } from '@/constants/Colors';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

export default function WeighScreen() {
  const router = useRouter();
  const { bookingId, bookingNumber } = useLocalSearchParams<{ bookingId: string; bookingNumber: string }>();

  const [actualWeight, setActualWeight] = useState('');
  const [actualBags, setActualBags] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [ownerNote, setOwnerNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate total
  const weight = parseFloat(actualWeight) || 0;
  const rate = parseFloat(ratePerUnit) || 0;
  const totalAmount = weight > 0 && rate > 0 ? (weight / 1000 * rate).toFixed(2) : '0.00'; // Rate per MT

  const handleConfirm = useCallback(async () => {
    if (!actualWeight || Number(actualWeight) <= 0) {
      setError('Enter actual weight');
      hapticError();
      return;
    }

    setError('');
    setLoading(true);
    hapticLight();

    try {
      const payload: any = {
        status: 'STORED',
        actualWeightKg: Number(actualWeight),
      };
      if (actualBags) payload.actualBags = Number(actualBags);
      if (ratePerUnit) payload.ratePerUnit = Number(ratePerUnit);
      if (rate > 0 && weight > 0) payload.totalAmount = Number(totalAmount);
      if (advancePaid) payload.advancePaid = Number(advancePaid);
      if (ownerNote.trim()) payload.ownerNote = ownerNote.trim();

      const res = await api.patch<any>(`/bookings/${bookingId}/status`, payload);
      if (res.success) {
        hapticSuccess();
        Alert.alert(
          '✅ Storage Confirmed',
          `Booking #${bookingNumber}\nWeight: ${actualWeight} Kg\n${rate > 0 ? `Total: ₹${totalAmount}` : ''}`,
          [
            { text: 'Back to Bookings', onPress: () => router.replace('/(owner)/bookings') },
          ],
        );
      } else {
        setError(res.error?.message || 'Failed to confirm storage');
        hapticError();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [actualWeight, actualBags, ratePerUnit, advancePaid, ownerNote, bookingId, bookingNumber, rate, weight, totalAmount, router]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Weighing & Confirm</Text>
          <Text style={styles.headerSub}>Booking #{bookingNumber}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="scale" size={22} color="#FBBF24" />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Weight section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="scale-outline" size={20} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Actual Measurements</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>Actual Weight (Kg) *</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputLarge}
                    value={actualWeight}
                    onChangeText={setActualWeight}
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  <Text style={styles.unit}>Kg</Text>
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Bag Count</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.inputLarge}
                    value={actualBags}
                    onChangeText={setActualBags}
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.unit}>bags</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pricing section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={20} color="#059669" />
              <Text style={styles.sectionTitle}>Pricing</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Rate (₹ per MT)</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.currencySign}>₹</Text>
                  <TextInput
                    style={styles.inputLarge}
                    value={ratePerUnit}
                    onChangeText={setRatePerUnit}
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Advance Paid</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.currencySign}>₹</Text>
                  <TextInput
                    style={styles.inputLarge}
                    value={advancePaid}
                    onChangeText={setAdvancePaid}
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {/* Total display */}
            {weight > 0 && rate > 0 && (
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Estimated Total</Text>
                <Text style={styles.totalAmount}>₹ {totalAmount}</Text>
                <Text style={styles.totalSub}>{weight} Kg × ₹{rate}/MT</Text>
              </View>
            )}
          </View>

          {/* Note */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note (optional)</Text>
            <View style={[styles.inputRow, { alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.inputLarge, { height: 60, textAlignVertical: 'top', fontSize: 14 }]}
                value={ownerNote}
                onChangeText={setOwnerNote}
                placeholder="Any observations..."
                placeholderTextColor="#D1D5DB"
                multiline
                maxLength={500}
              />
            </View>
          </View>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <LinearGradient colors={['#059669', '#34D399']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                  <Text style={styles.confirmText}>Confirm Storage</Text>
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
  screen: { flex: 1, backgroundColor: '#F8F7FC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  errorText: { fontSize: 12, color: '#EF4444', fontWeight: '500' },

  section: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },

  row: { flexDirection: 'row', gap: 12 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 6,
  },
  inputLarge: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  unit: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  currencySign: { fontSize: 18, color: '#9CA3AF', fontWeight: '700', marginRight: 4 },

  totalBox: {
    marginTop: 12, padding: 14, borderRadius: 10,
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#D1FAE5', alignItems: 'center',
  },
  totalLabel: { fontSize: 11, color: '#059669', fontWeight: '600', textTransform: 'uppercase' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#047857', marginTop: 4 },
  totalSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  confirmBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', ...Shadows.md },
  confirmGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14,
  },
  confirmText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
