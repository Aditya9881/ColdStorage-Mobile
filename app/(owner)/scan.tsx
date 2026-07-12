/**
 * SheetKosh — QR Scanner Screen (Owner/Staff)
 *
 * Scans farmer's booking QR code on arrival.
 * Uses the camera to read QR, then calls verify-qr API.
 * Falls back to manual booking number entry.
 *
 * Note: expo-camera or expo-barcode-scanner required.
 * This implementation provides both camera scan and manual entry fallback.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Shadows } from '@/constants/Colors';
import { hapticLight, hapticSuccess, hapticError, hapticMedium } from '@/lib/haptics';

export default function ScanScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [bookingNumber, setBookingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Handle QR code scanned (will integrate with expo-camera later)
  const handleQRScanned = useCallback(async (qrData: string) => {
    if (loading) return;
    setLoading(true);
    setError('');
    hapticMedium();

    try {
      const res = await api.post<any>('/bookings/verify-qr', { qrPayload: qrData });
      if (res.success && res.data) {
        hapticSuccess();
        setResult(res.data);
      } else {
        hapticError();
        setError(res.error?.message || 'Invalid QR code');
      }
    } catch (err: any) {
      hapticError();
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Manual booking number lookup
  const handleManualLookup = useCallback(async () => {
    if (!bookingNumber.trim()) {
      setError('Enter a booking number');
      hapticError();
      return;
    }

    setLoading(true);
    setError('');
    hapticLight();

    try {
      const res = await api.get<any>(`/bookings/number/${bookingNumber.trim().toUpperCase()}`);
      if (res.success && res.data) {
        setResult(res.data);
        hapticSuccess();
      } else {
        setError('Booking not found');
        hapticError();
      }
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [bookingNumber]);

  // Mark as arrived (for manual lookup flow)
  const handleMarkArrived = useCallback(async () => {
    if (!result) return;
    setLoading(true);

    try {
      const res = await api.patch<any>(`/bookings/${result.id}/status`, { status: 'ARRIVED' });
      if (res.success) {
        hapticSuccess();
        setResult(res.data);
        Alert.alert('Arrival Confirmed', `Booking #${result.bookingNumber} — farmer has arrived.`);
      } else {
        hapticError();
        Alert.alert('Error', res.error?.message || 'Failed to mark arrival');
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [result]);

  const resetScan = () => {
    setResult(null);
    setError('');
    setBookingNumber('');
  };

  // Result view
  if (result) {
    const isArrived = result.status === 'ARRIVED';
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
          <TouchableOpacity onPress={resetScan} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Found</Text>
        </LinearGradient>

        <View style={styles.resultContent}>
          {/* Success check */}
          <View style={[styles.successCircle, isArrived ? { backgroundColor: '#D1FAE5' } : { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name={isArrived ? 'checkmark-circle' : 'search-circle'} size={64} color={isArrived ? '#059669' : '#7C3AED'} />
          </View>

          <Text style={styles.resultTitle}>
            {isArrived ? '✅ Arrival Confirmed' : 'Booking Details'}
          </Text>
          <Text style={styles.resultBookingNo}>#{result.bookingNumber}</Text>

          {/* Info cards */}
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline" label="Farmer" value={result.farmer?.fullName || '-'} />
            <InfoRow icon="call-outline" label="Phone" value={result.farmer?.phone || '-'} />
            <InfoRow icon="card-outline" label="ID" value={result.farmer?.uniqueId || '-'} />
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="leaf-outline" label="Commodity" value={result.commodityName} />
            <InfoRow icon="scale-outline" label="Est. Weight" value={`${result.estimatedWeightKg} Kg`} />
            <InfoRow icon="calendar-outline" label="Date" value={new Date(result.preferredDate).toLocaleDateString('en-IN')} />
          </View>

          <View style={styles.infoCard}>
            <InfoRow icon="flag-outline" label="Status" value={result.status.replace(/_/g, ' ')} />
          </View>

          {/* Actions */}
          {result.status === 'CONFIRMED' && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleMarkArrived} disabled={loading}>
              <LinearGradient colors={['#059669', '#34D399']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="location" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Mark as Arrived</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isArrived && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                router.push({ pathname: '/owner-booking/weigh', params: { bookingId: result.id, bookingNumber: result.bookingNumber } });
                hapticLight();
              }}
            >
              <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="scale-outline" size={20} color="#FFF" />
                <Text style={styles.actionText}>Proceed to Weighing</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
            <Ionicons name="scan-outline" size={18} color="#7C3AED" />
            <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 14 }}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.header}>
        <Text style={styles.headerTitle}>QR Scanner</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.scanContent}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'scan' && styles.modeBtnActive]}
              onPress={() => { setMode('scan'); hapticLight(); }}
            >
              <Ionicons name="qr-code-outline" size={16} color={mode === 'scan' ? '#FFF' : '#6B7280'} />
              <Text style={[styles.modeBtnText, mode === 'scan' && { color: '#FFF' }]}>Camera Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
              onPress={() => { setMode('manual'); hapticLight(); }}
            >
              <Ionicons name="keypad-outline" size={16} color={mode === 'manual' ? '#FFF' : '#6B7280'} />
              <Text style={[styles.modeBtnText, mode === 'manual' && { color: '#FFF' }]}>Manual Entry</Text>
            </TouchableOpacity>
          </View>

          {mode === 'scan' ? (
            /* Camera placeholder — integrate expo-camera or expo-barcode-scanner here */
            <View style={styles.cameraPlaceholder}>
              <View style={styles.cameraFrame}>
                <Ionicons name="scan" size={120} color="rgba(124,58,237,0.3)" />
              </View>
              <Text style={styles.cameraHint}>Camera scanner will be available{'\n'}once expo-camera is configured</Text>
              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => { setMode('manual'); hapticLight(); }}
              >
                <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 14 }}>
                  Use manual entry instead →
                </Text>
              </TouchableOpacity>

              {/* Demo: simulate QR scan */}
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => {
                  Alert.alert('Demo', 'Switch to Manual Entry mode to look up bookings by number');
                }}
              >
                <Ionicons name="flask-outline" size={14} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Demo: Simulate scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Manual entry */
            <View style={styles.manualSection}>
              <View style={styles.manualIcon}>
                <Ionicons name="document-text-outline" size={48} color="#7C3AED" />
              </View>
              <Text style={styles.manualTitle}>Enter Booking Number</Text>
              <Text style={styles.manualSub}>Ask the farmer for their booking number</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputRow}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  value={bookingNumber}
                  onChangeText={setBookingNumber}
                  placeholder="e.g. CS-ABC-20260708-001"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  returnKeyType="search"
                  onSubmitEditing={handleManualLookup}
                />
              </View>

              <TouchableOpacity
                style={[styles.lookupBtn, loading && { opacity: 0.7 }]}
                onPress={handleManualLookup}
                disabled={loading}
              >
                <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.lookupGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="search" size={18} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Look Up Booking</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color="#9CA3AF" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },

  scanContent: { flex: 1, padding: 20 },

  // Mode toggle
  modeToggle: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  modeBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  // Camera placeholder
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  cameraFrame: {
    width: 220, height: 220, borderRadius: 20,
    borderWidth: 3, borderColor: 'rgba(124,58,237,0.2)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF5FF',
  },
  cameraHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  switchLink: { marginTop: 8 },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },

  // Manual entry
  manualSection: { flex: 1, alignItems: 'center', paddingTop: 40 },
  manualIcon: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  manualTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  manualSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 24 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%',
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  errorText: { fontSize: 12, color: '#EF4444', fontWeight: '500' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%',
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '600' },

  lookupBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  lookupGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },

  // Result view
  resultContent: { flex: 1, padding: 20, alignItems: 'center' },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  resultTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  resultBookingNo: { fontSize: 22, fontWeight: '800', color: '#7C3AED', marginBottom: 20, letterSpacing: 0.5 },

  infoCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 10, ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6,', gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', width: 70 },
  infoValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '600', flex: 1 },

  actionBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  actionGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  actionText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#7C3AED',
  },
});
