import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

const ORDER_STEPS = [
  { status: 'PENDING_APPROVAL', label: 'Order Placed' },
  { status: 'APPROVED', label: 'Farmer Approved' },
  { status: 'DISPATCHED', label: 'Dispatched' },
  { status: 'COMPLETED', label: 'Completed' },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get<any>(`/orders/${id}`);
        if (res.success) setOrder(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  const isSeller = order?.listing?.seller?.id === user?.id;
  const isPending = order?.status === 'PENDING_APPROVAL';

  async function handleApprove() {
    if (!otp || otp.length !== 6) { Alert.alert('OTP Required', 'Enter the 6-digit OTP to approve'); return; }
    setProcessing(true);
    try {
      const res = await api.post<any>(`/orders/${id}/approve`, { otp });
      if (res.success) {
        Alert.alert('Approved!', 'Order has been approved');
        const refresh = await api.get<any>(`/orders/${id}`);
        if (refresh.success) setOrder(refresh.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve');
    } finally { setProcessing(false); }
  }

  async function handleReject() {
    Alert.alert('Reject Order?', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          setProcessing(true);
          try {
            await api.post(`/orders/${id}/reject`, { reason: 'Rejected by farmer' });
            const refresh = await api.get<any>(`/orders/${id}`);
            if (refresh.success) setOrder(refresh.data);
          } catch (err: any) { Alert.alert('Error', err.message); }
          finally { setProcessing(false); }
        },
      },
    ]);
  }

  const handleNumpadPress = (val: string) => {
    if (otp.length < 6) {
      setOtp((prev) => prev + val);
    }
  };

  const handleNumpadDelete = () => {
    setOtp((prev) => prev.slice(0, -1));
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!order) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Order not found</Text></View>;
  }

  // Calculate stepper indices
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.status === order.status);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Visual Timeline Stepper */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.lg }]}>Order Timeline</Text>
        <View style={styles.stepperContainer}>
          {ORDER_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex && order.status !== 'REJECTED' && order.status !== 'CANCELLED';
            const isCurrent = idx === currentStepIndex;
            return (
              <View key={idx} style={styles.stepWrapper}>
                <View style={styles.stepIndicatorColumn}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isCompleted ? colors.primary : colors.border,
                        borderColor: isCurrent ? colors.primaryLight : 'transparent',
                        borderWidth: isCurrent ? 2 : 0,
                      },
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : (
                      <View style={[styles.stepDotInner, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                  {idx < ORDER_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        { backgroundColor: idx < currentStepIndex ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepLabelText,
                      {
                        color: isCompleted ? colors.text : colors.textTertiary,
                        fontWeight: isCurrent ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Order Summary */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {order.listing?.lot?.commodityName}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Lot: {order.listing?.lot?.lotNumber}
        </Text>

        <View style={[styles.amountRow, { backgroundColor: colors.cardAlt }]}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Total Amount</Text>
            <Text style={[styles.amount, { color: colors.primary }]}>₹{Number(order.totalAmount).toLocaleString()}</Text>
          </View>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Quantity</Text>
            <Text style={[styles.amountVal, { color: colors.text }]}>{Number(order.quantityKg)} kg</Text>
          </View>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Rate</Text>
            <Text style={[styles.amountVal, { color: colors.text }]}>₹{Number(order.agreedPricePerKg)}/kg</Text>
          </View>
        </View>
      </View>

      {/* Buyer/Seller Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Parties Involved</Text>
        <View style={styles.partyRow}>
          <Ionicons name="person" size={18} color={colors.primary} />
          <View style={{ marginLeft: Spacing.md }}>
            <Text style={[styles.partyLabel, { color: colors.textTertiary }]}>Buyer</Text>
            <Text style={[styles.partyName, { color: colors.text }]}>{order.buyer?.fullName}</Text>
            <Text style={[styles.partyMeta, { color: colors.textSecondary }]}>
              📱 {order.buyer?.phone} • {order.buyer?.city}
            </Text>
          </View>
        </View>
        <View style={[styles.partyRow, { marginTop: Spacing.md }]}>
          <Ionicons name="leaf" size={18} color={colors.success} />
          <View style={{ marginLeft: Spacing.md }}>
            <Text style={[styles.partyLabel, { color: colors.textTertiary }]}>Seller (Farmer)</Text>
            <Text style={[styles.partyName, { color: colors.text }]}>{order.listing?.seller?.fullName}</Text>
          </View>
        </View>
      </View>

      {/* OTP Approval (Farmer Only) with custom numpad */}
      {isSeller && isPending && (
        <View style={[styles.card, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}>
          <View style={styles.otpHeader}>
            <Ionicons name="key" size={24} color="#D97706" />
            <Text style={[styles.otpTitle, { color: '#92400E' }]}>Farmer OTP Release Approval</Text>
          </View>
          {order.otpCode && (
            <View style={styles.otpDisplay}>
              <Text style={styles.otpDisplayLabel}>Your OTP for confirmation:</Text>
              <Text style={styles.otpDisplayCode}>{order.otpCode}</Text>
            </View>
          )}

          {/* OTP Code fields */}
          <View style={styles.otpInputFields}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <View key={idx} style={[styles.otpDigitBox, { borderColor: otp[idx] ? colors.primary : '#D97706' }]}>
                <Text style={styles.otpDigitText}>{otp[idx] || ''}</Text>
              </View>
            ))}
          </View>

          {/* Custom Numpad Keyboard */}
          <View style={styles.numpadContainer}>
            <View style={styles.numpadRow}>
              {['1', '2', '3'].map((val) => (
                <TouchableOpacity key={val} style={styles.numpadKey} onPress={() => handleNumpadPress(val)}>
                  <Text style={styles.numpadText}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              {['4', '5', '6'].map((val) => (
                <TouchableOpacity key={val} style={styles.numpadKey} onPress={() => handleNumpadPress(val)}>
                  <Text style={styles.numpadText}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              {['7', '8', '9'].map((val) => (
                <TouchableOpacity key={val} style={styles.numpadKey} onPress={() => handleNumpadPress(val)}>
                  <Text style={styles.numpadText}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadRow}>
              <View style={styles.numpadKeyEmpty} />
              <TouchableOpacity style={styles.numpadKey} onPress={() => handleNumpadPress('0')}>
                <Text style={styles.numpadText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.numpadKey} onPress={handleNumpadDelete}>
                <Ionicons name="backspace-outline" size={24} color="#1A1A2E" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.otpActions}>
            <TouchableOpacity
              style={[styles.approveBtn, { opacity: processing ? 0.6 : 1 }]}
              onPress={handleApprove}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { opacity: processing ? 0.6 : 1 }]}
              onPress={handleReject}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={18} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status Details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Detail</Text>
        <Text style={[styles.statusTextValue, { color: colors.primary }]}>
          {order.status?.replace(/_/g, ' ')}
        </Text>
        {order.approvedAt && (
          <Text style={[styles.statusDetail, { color: colors.success }]}>
            ✅ Approved on {new Date(order.approvedAt).toLocaleString()}
          </Text>
        )}
        {order.rejectedReason && (
          <Text style={[styles.statusDetail, { color: '#DC2626' }]}>
            ❌ Reason: {order.rejectedReason}
          </Text>
        )}
      </View>

      {/* Escrow & Payment Section */}
      {order.status !== 'REJECTED' && order.status !== 'CANCELLED' && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment & Escrow</Text>
          {/* Buyer: Pay button for approved orders */}
          {!isSeller && order.status === 'APPROVED' && (
            <TouchableOpacity
              style={[styles.approveBtn, { marginBottom: Spacing.sm }]}
              onPress={() => router.push({ pathname: '/orders/payment', params: { orderId: order.id } })}
            >
              <Ionicons name="card-outline" size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>Make Payment (Razorpay)</Text>
            </TouchableOpacity>
          )}
          {/* Both roles: Track escrow status */}
          {(order.status === 'APPROVED' || order.status === 'DISPATCHED' || order.status === 'COMPLETED') && (
            <TouchableOpacity
              style={[styles.rejectBtn, { borderColor: colors.primary }]}
              onPress={() => router.push({ pathname: '/orders/escrow-status', params: { orderId: order.id } })}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={[styles.rejectBtnText, { color: colors.primary }]}>Track Escrow Status</Text>
            </TouchableOpacity>
          )}
          {order.status === 'PENDING_APPROVAL' && !isSeller && (
            <Text style={[styles.statusDetail, { color: colors.textTertiary }]}>
              Payment will be available after the seller approves your order.
            </Text>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  meta: { fontSize: FontSize.sm, marginBottom: Spacing.lg },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, borderRadius: BorderRadius.md },
  amountLabel: { fontSize: FontSize.xs },
  amount: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  amountVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  partyRow: { flexDirection: 'row', alignItems: 'center' },
  partyLabel: { fontSize: FontSize.xs },
  partyName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  partyMeta: { fontSize: FontSize.sm, marginTop: 2 },
  stepperContainer: {
    paddingLeft: Spacing.sm,
  },
  stepWrapper: {
    flexDirection: 'row',
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    marginTop: -2,
    marginBottom: -2,
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingBottom: Spacing.md,
    justifyContent: 'center',
  },
  stepLabelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  otpTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  otpDisplay: { backgroundColor: '#FEF3C7', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  otpDisplayLabel: { fontSize: FontSize.xs, color: '#92400E' },
  otpDisplayCode: { fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, color: '#92400E', letterSpacing: 8 },
  otpInputFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  otpDigitBox: {
    width: 45,
    height: 55,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  numpadContainer: {
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  numpadKey: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  numpadKeyEmpty: {
    flex: 1,
  },
  numpadText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  otpActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: '#059669', padding: Spacing.md, borderRadius: BorderRadius.md },
  approveBtnText: { color: '#FFF', fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md },
  rejectBtnText: { color: '#DC2626', fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  statusTextValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textTransform: 'capitalize' },
  statusDetail: { fontSize: FontSize.sm, marginTop: Spacing.sm },
});
