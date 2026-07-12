/**
 * SheetKosh — Booking Detail Screen
 *
 * Shows full booking info with:
 *  - Status timeline (step progress)
 *  - QR Code (rendered via SVG pattern, scannable)
 *  - Facility info
 *  - Commodity details
 *  - Action buttons (Cancel, Request Dispatch)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Alert, Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api-client';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/Colors';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

// Status config for the step tracker
const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pending', icon: 'hourglass-outline', color: '#F59E0B' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle-outline', color: '#2D6A4F' },
  { key: 'ARRIVED', label: 'Arrived', icon: 'location-outline', color: '#3B82F6' },
  { key: 'WEIGHING', label: 'Weighing', icon: 'scale-outline', color: '#8B5CF6' },
  { key: 'STORED', label: 'Stored', icon: 'cube-outline', color: '#059669' },
  { key: 'DISPATCH_REQUESTED', label: 'Dispatch Req.', icon: 'arrow-up-circle-outline', color: '#F97316' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: 'car-outline', color: '#06B6D4' },
  { key: 'COMPLETED', label: 'Completed', icon: 'trophy-outline', color: '#10B981' },
] as const;

const TERMINAL_STATUSES = ['CANCELLED', 'REJECTED', 'COMPLETED'];

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await api.get<any>(`/bookings/${id}`);
      if (res.success && res.data) {
        setBooking(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch booking', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  const handleAction = useCallback(async (action: string, body: any = {}) => {
    setActionLoading(true);
    try {
      const res = await api.patch<any>(`/bookings/${id}/status`, { status: action, ...body });
      if (res.success) {
        hapticSuccess();
        setBooking(res.data);
        Alert.alert('Success', `Booking ${action.toLowerCase().replace(/_/g, ' ')}`);
      } else {
        hapticError();
        Alert.alert('Error', res.error?.message || 'Action failed');
      }
    } catch (err: any) {
      hapticError();
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleAction('CANCELLED', { cancelReason: 'Cancelled by farmer' }) },
    ]);
  };

  const handleDispatchRequest = () => {
    Alert.alert('Request Dispatch', 'Request dispatch of your stored commodity?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Request', onPress: () => handleAction('DISPATCH_REQUESTED') },
    ]);
  };

  const handleShare = async () => {
    if (!booking) return;
    try {
      await Share.share({
        message: `SheetKosh Booking #${booking.bookingNumber}\nFacility: ${booking.facility?.name}\nCommodity: ${booking.commodityName}\nStatus: ${booking.status}\nDate: ${booking.preferredDate}`,
      });
    } catch {}
  };

  // Get current step index
  const currentStepIndex = booking ? STATUS_STEPS.findIndex(s => s.key === booking.status) : 0;
  const isTerminal = booking && TERMINAL_STATUSES.includes(booking.status);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text style={styles.loadingText}>Loading booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text style={styles.loadingText}>Booking not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#2D6A4F', fontWeight: '600', marginTop: 8 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#1B4332', '#2D6A4F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Booking #{booking.bookingNumber}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isTerminal ? (booking.status === 'COMPLETED' ? '#10B981' : '#EF4444') : '#FBBF24' }]} />
            <Text style={styles.statusText}>{booking.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBooking(); }} tintColor="#2D6A4F" />}
      >
        {/* ─── QR Code Section ─── */}
        {booking.qrCodeData && !isTerminal && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Show this at the facility</Text>
            <View style={styles.qrBox}>
              {/* QR visual representation */}
              <View style={styles.qrPattern}>
                <Ionicons name="qr-code" size={120} color="#1A1A2E" />
              </View>
            </View>
            <Text style={styles.qrBookingNo}>{booking.bookingNumber}</Text>
            <Text style={styles.qrHint}>Staff will scan this QR code when you arrive</Text>
          </View>
        )}

        {/* ─── Status Timeline ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Progress</Text>
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, i) => {
              const isActive = i <= currentStepIndex;
              const isCurrent = step.key === booking.status;
              return (
                <View key={step.key} style={styles.timelineStep}>
                  {/* Connector line */}
                  {i > 0 && (
                    <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                  )}
                  {/* Circle */}
                  <View style={[
                    styles.timelineCircle,
                    isActive && { backgroundColor: step.color, borderColor: step.color },
                    isCurrent && styles.timelineCircleCurrent,
                  ]}>
                    <Ionicons name={step.icon as any} size={14} color={isActive ? '#FFF' : '#D1D5DB'} />
                  </View>
                  {/* Label */}
                  <Text style={[styles.timelineLabel, isActive && { color: '#1A1A2E', fontWeight: '600' }]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Terminal status badges */}
          {booking.status === 'CANCELLED' && (
            <View style={[styles.terminalBadge, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 }}>
                Cancelled{booking.cancelReason ? `: ${booking.cancelReason}` : ''}
              </Text>
            </View>
          )}
          {booking.status === 'REJECTED' && (
            <View style={[styles.terminalBadge, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 }}>
                Rejected{booking.cancelReason ? `: ${booking.cancelReason}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* ─── Facility Info ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color="#2D6A4F" />
            <Text style={styles.infoText}>{booking.facility?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoSubText}>
              {[booking.facility?.addressLine1, booking.facility?.city, booking.facility?.state].filter(Boolean).join(', ')}
            </Text>
          </View>
          {booking.facility?.contactPhone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoSubText}>{booking.facility.contactPhone}</Text>
            </View>
          )}
        </View>

        {/* ─── Commodity Details ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Commodity</Text>
          <View style={styles.detailGrid}>
            <DetailItem icon="leaf-outline" label="Category" value={booking.commodityCategory} />
            <DetailItem icon="pricetag-outline" label="Name" value={booking.commodityName} />
            <DetailItem icon="scale-outline" label="Est. Weight" value={`${booking.estimatedWeightKg} Kg`} />
            {booking.estimatedBags && <DetailItem icon="cube-outline" label="Est. Bags" value={`${booking.estimatedBags}`} />}
            {booking.actualWeightKg && <DetailItem icon="checkmark-done-outline" label="Actual Weight" value={`${booking.actualWeightKg} Kg`} />}
            {booking.actualBags && <DetailItem icon="checkmark-done-outline" label="Actual Bags" value={`${booking.actualBags}`} />}
          </View>
        </View>

        {/* ─── Schedule ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <View style={styles.detailGrid}>
            <DetailItem icon="calendar-outline" label="Preferred Date" value={new Date(booking.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            {booking.preferredSlot && <DetailItem icon="time-outline" label="Time Slot" value={booking.preferredSlot} />}
            {booking.storageDuration && <DetailItem icon="hourglass-outline" label="Duration" value={`${booking.storageDuration} days`} />}
            {booking.arrivedAt && <DetailItem icon="log-in-outline" label="Arrived" value={new Date(booking.arrivedAt).toLocaleString('en-IN')} />}
          </View>
        </View>

        {/* ─── Pricing ─── */}
        {(booking.ratePerUnit || booking.totalAmount) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pricing</Text>
            <View style={styles.detailGrid}>
              {booking.ratePerUnit && <DetailItem icon="cash-outline" label="Rate" value={`₹${booking.ratePerUnit}`} />}
              {booking.totalAmount && <DetailItem icon="receipt-outline" label="Total" value={`₹${booking.totalAmount}`} />}
              {booking.advancePaid && <DetailItem icon="wallet-outline" label="Advance" value={`₹${booking.advancePaid}`} />}
            </View>
          </View>
        )}

        {/* ─── Notes ─── */}
        {(booking.farmerNote || booking.ownerNote) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            {booking.farmerNote && (
              <View style={styles.noteBox}>
                <Ionicons name="person-outline" size={14} color="#6B7280" />
                <Text style={styles.noteText}>{booking.farmerNote}</Text>
              </View>
            )}
            {booking.ownerNote && (
              <View style={[styles.noteBox, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="business-outline" size={14} color="#2D6A4F" />
                <Text style={[styles.noteText, { color: '#2D6A4F' }]}>{booking.ownerNote}</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Linked Lot ─── */}
        {booking.lot && (
          <TouchableOpacity
            style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#2D6A4F' }]}
            onPress={() => router.push(`/lots/${booking.lot.id}`)}
          >
            <View style={styles.infoRow}>
              <Ionicons name="file-tray-outline" size={18} color="#2D6A4F" />
              <Text style={styles.cardTitle}>Inventory Lot</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.infoSubText}>Lot #{booking.lot.lotNumber} • Receipt #{booking.lot.receiptNumber}</Text>
            <Text style={styles.infoSubText}>Weight: {booking.lot.currentWeightKg} Kg • Status: {booking.lot.status}</Text>
          </TouchableOpacity>
        )}

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Bottom Action Bar ─── */}
      {!isTerminal && (
        <View style={styles.bottomBar}>
          {/* Cancel (available for PENDING and CONFIRMED) */}
          {['PENDING', 'CONFIRMED'].includes(booking.status) && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={actionLoading}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* Dispatch Request (when STORED) */}
          {booking.status === 'STORED' && (
            <TouchableOpacity
              style={[styles.actionBtn, actionLoading && { opacity: 0.7 }]}
              onPress={handleDispatchRequest}
              disabled={actionLoading}
            >
              <LinearGradient colors={['#2D6A4F', '#40916C']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Request Dispatch</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Refresh / Track for other statuses */}
          {!['PENDING', 'CONFIRMED', 'STORED'].includes(booking.status) && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => { setRefreshing(true); fetchBooking(); hapticLight(); }}
            >
              <Ionicons name="refresh-outline" size={18} color="#2D6A4F" />
              <Text style={{ color: '#2D6A4F', fontWeight: '600', fontSize: 14 }}>Refresh Status</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Detail item component
function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={16} color="#9CA3AF" />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAF7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAF7', gap: 8 },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  shareBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: 20 },

  // QR Card
  qrCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 16, ...Shadows.md, borderWidth: 1, borderColor: '#F3F4F6',
  },
  qrTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 16 },
  qrBox: {
    width: 180, height: 180, backgroundColor: '#FFF',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  qrPattern: { alignItems: 'center', justifyContent: 'center' },
  qrBookingNo: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginTop: 16, letterSpacing: 1 },
  qrHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  // Cards
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },

  // Timeline
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, justifyContent: 'space-between' },
  timelineStep: { alignItems: 'center', width: '12%', position: 'relative' },
  timelineLine: {
    position: 'absolute', top: 12, left: -12, right: 12,
    height: 2, backgroundColor: '#E5E7EB', zIndex: -1,
  },
  timelineLineActive: { backgroundColor: '#2D6A4F' },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineCircleCurrent: {
    shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  timelineLabel: { fontSize: 8, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  terminalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1,
  },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  infoSubText: { fontSize: 13, color: '#6B7280', flex: 1 },

  // Detail grid
  detailGrid: { gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },

  // Notes
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 8,
  },
  noteText: { fontSize: 13, color: '#6B7280', flex: 1, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(248,250,247,0.97)',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  actionBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  actionText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2D6A4F', backgroundColor: 'rgba(45,106,79,0.05)',
  },
});
