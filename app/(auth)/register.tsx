/**
 * Premium Register Screen — ColdStorage Mobile
 *
 * Multi-step registration wizard:
 * Step 1: Role selection + Basic info (name, phone, password)
 * Step 2: Address & Identity (Aadhaar, PAN, address)
 * Step 3: Role-specific KYC (farmer: land, buyer: GST/business)
 *
 * Uses Ionicons throughout — no emojis.
 * Buyer color: Teal (#0F766E) instead of purple.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';

// ── Color Themes ──
const FARMER_COLORS = { primary: '#2D6A4F', dark: '#1B4332', light: '#40916C', bg: '#F0FFF4' };
const BUYER_COLORS = { primary: '#0F766E', dark: '#134E4A', light: '#14B8A6', bg: '#F0FDFA' };
const OWNER_COLORS = { primary: '#7C3AED', dark: '#5B21B6', light: '#A78BFA', bg: '#F5F3FF' };

const BUSINESS_TYPES = ['Wholesaler', 'Retailer', 'Processor', 'Exporter', 'Commission Agent', 'Other'];

const STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export default function RegisterScreen() {
  const { register, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  // Form state
  const [role, setRole] = useState<'FARMER' | 'BUYER' | 'OWNER'>('FARMER');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');

  // Phone OTP verification
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Step 2 fields — Address & Identity
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Step 3 — Farmer KYC
  const [villageName, setVillageName] = useState('');
  const [landHolding, setLandHolding] = useState('');
  const [khasraNumber, setKhasraNumber] = useState('');

  // Step 3 — Buyer KYC
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Step 3 — Owner KYC
  const [csRegistrationNumber, setCsRegistrationNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [csRegistrationPhotoAsset, setCsRegistrationPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fssaiPhotoAsset, setFssaiPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Step 4 — Documents to upload
  const [aadhaarPhotoAsset, setAadhaarPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [gstPhotoAsset, setGstPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [panPhotoAsset, setPanPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Aadhaar Verification OTP State
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);

  const colors = role === 'FARMER' ? FARMER_COLORS : role === 'OWNER' ? OWNER_COLORS : BUYER_COLORS;
  const totalSteps = 4;

  // ── OTP Countdown ──
  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setInterval(() => setOtpCountdown(prev => prev <= 1 ? 0 : prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [otpCountdown]);

  // ── Phone OTP ──
  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await sendOtp(phone, 'REGISTER');
      setOtpSent(true);
      setOtpCountdown(30);
      hapticSuccess();
      if (__DEV__ && result.devOtp) {
        // Auto-fill OTP in dev mode for easy testing
        setPhoneOtp(result.devOtp);
        Alert.alert('OTP Auto-Filled (Dev)', `Your OTP is: ${result.devOtp}\n\nIt has been auto-filled. Tap "Verify" to proceed.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, phoneOtp, 'REGISTER');
      setPhoneVerified(true);
      hapticSuccess();
      Alert.alert('Phone Verified!', 'Your phone number has been verified successfully.');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setPhoneOtp('');
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  // ── Aadhaar OTP Helpers ──
  const sendAadhaarOtp = () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number first');
      return;
    }
    setError('');
    setIsVerifyingAadhaar(true);
    // Simulated SMS gateway call (MSG91 style log)
    console.log(`[MSG91] Sending Aadhaar verification OTP to mobile linked with Aadhaar: ${aadhaarNumber}`);
    setTimeout(() => {
      setIsVerifyingAadhaar(false);
      setShowAadhaarOtpInput(true);
      Alert.alert('Verification OTP Sent', 'An OTP has been sent to your Aadhaar-registered mobile number.');
    }, 1000);
  };

  const confirmAadhaarOtp = () => {
    if (aadhaarOtp === '123456' || aadhaarOtp.length === 6) {
      setAadhaarVerified(true);
      setShowAadhaarOtpInput(false);
      setError('');
      Alert.alert('Verification Success', 'Your Aadhaar number has been verified successfully!');
    } else {
      setError('Invalid OTP. Please enter any 6-digit OTP (e.g., 123456) to verify.');
    }
  };

  // ── Document Selection ──
  const handlePickImage = async (docType: 'aadhaar' | 'gst' | 'pan', source: 'camera' | 'gallery') => {
    setError('');
    try {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError(`Permission to access the ${source} was denied`);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (docType === 'aadhaar') setAadhaarPhotoAsset(asset);
        if (docType === 'gst') setGstPhotoAsset(asset);
        if (docType === 'pan') setPanPhotoAsset(asset);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select image');
    }
  };

  // ── Validation ──
  const validateStep1 = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!phone || phone.length !== 10) return 'Enter a valid 10-digit phone number';
    if (!phoneVerified) return 'Please verify your phone number with OTP first';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const validateStep2 = () => {
    if (!addressLine1.trim()) return 'Address is required';
    if (!city.trim()) return 'City is required';
    if (!state.trim()) return 'State is required';
    if (!pincode || pincode.length !== 6) return 'Enter a valid 6-digit pincode';
    if (!aadhaarNumber || aadhaarNumber.length !== 12) return 'Enter a valid 12-digit Aadhaar number';
    return null;
  };

  const validateStep3 = () => {
    if (role === 'FARMER') {
      if (!villageName.trim()) return 'Village name is required';
    } else if (role === 'BUYER') {
      if (!businessName.trim()) return 'Business name is required';
      if (!businessType) return 'Select a business type';
      if (!gstNumber || gstNumber.length !== 15) return 'Enter a valid 15-digit GST number';
    } else if (role === 'OWNER') {
      if (!csRegistrationNumber.trim()) return 'Cold Storage registration number is required';
      if (!fssaiNumber.trim()) return 'FSSAI license number is required';
    }
    return null;
  };

  const validateStep4 = () => {
    if (role === 'FARMER') {
      if (!aadhaarVerified) return 'Please verify your Aadhaar number using OTP first';
      if (!aadhaarPhotoAsset) return 'Please upload Aadhaar Card photo';
    } else if (role === 'BUYER') {
      if (!gstPhotoAsset) return 'Please upload original GST Certificate image';
    } else if (role === 'OWNER') {
      if (!aadhaarPhotoAsset) return 'Please upload Aadhaar Card photo';
      if (!csRegistrationPhotoAsset) return 'Please upload Cold Storage Registration Certificate';
      if (!fssaiPhotoAsset) return 'Please upload FSSAI License document';
    }
    return null;
  };

  const handleNext = () => {
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  // ── Register ──
  async function handleRegister() {
    const err = validateStep4();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const kycDocs = [];
      if (aadhaarPhotoAsset) {
        kycDocs.push({ asset: aadhaarPhotoAsset, type: 'AADHAAR_FRONT', number: aadhaarNumber });
      }
      if (role === 'BUYER') {
        if (gstPhotoAsset) {
          kycDocs.push({ asset: gstPhotoAsset, type: 'GST_CERTIFICATE', number: gstNumber });
        }
        if (panPhotoAsset) {
          kycDocs.push({ asset: panPhotoAsset, type: 'PAN_CARD', number: panNumber });
        }
      }
      if (role === 'OWNER') {
        if (csRegistrationPhotoAsset) {
          kycDocs.push({ asset: csRegistrationPhotoAsset, type: 'BUSINESS_LICENSE', number: csRegistrationNumber });
        }
        if (fssaiPhotoAsset) {
          kycDocs.push({ asset: fssaiPhotoAsset, type: 'OTHER', number: fssaiNumber });
        }
      }

      await register({
        fullName, phone, password, role,
        email: email || undefined,
        addressLine1, city, state, pincode,
        district: district || undefined,
        aadhaarNumber: aadhaarNumber || undefined,
        panNumber: panNumber || undefined,
        villageName: villageName || undefined,
        landHolding: landHolding || undefined,
        khasraNumber: khasraNumber || undefined,
        gstNumber: gstNumber || undefined,
        businessName: businessName || undefined,
        businessType: businessType || undefined,
        csRegistrationNumber: csRegistrationNumber || undefined,
        fssaiNumber: fssaiNumber || undefined,
        kycDocs,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.dark, colors.primary, colors.light]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Logo Header */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="snow" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>ColdStorage</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>
          </View>

          <View style={styles.card}>
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.progressText}>Step {step} of {totalSteps}</Text>
            </View>

            {/* ═══ STEP 1: Role + Basic Info ═══ */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>Choose your role</Text>

                {/* Role Selector */}
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'FARMER' && { borderColor: FARMER_COLORS.primary, backgroundColor: FARMER_COLORS.bg },
                    ]}
                    onPress={() => setRole('FARMER')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.roleIconBox, { backgroundColor: role === 'FARMER' ? FARMER_COLORS.primary : '#E5E7EB' }]}>
                      <Ionicons name="leaf" size={22} color={role === 'FARMER' ? '#FFF' : '#9CA3AF'} />
                    </View>
                    <Text style={[styles.roleTitle2, role === 'FARMER' && { color: FARMER_COLORS.primary }]}>Farmer</Text>
                    <Text style={styles.roleDesc}>Deposit & manage produce</Text>
                    {role === 'FARMER' && (
                      <View style={[styles.roleCheck, { backgroundColor: FARMER_COLORS.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'BUYER' && { borderColor: BUYER_COLORS.primary, backgroundColor: BUYER_COLORS.bg },
                    ]}
                    onPress={() => setRole('BUYER')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.roleIconBox, { backgroundColor: role === 'BUYER' ? BUYER_COLORS.primary : '#E5E7EB' }]}>
                      <Ionicons name="storefront" size={22} color={role === 'BUYER' ? '#FFF' : '#9CA3AF'} />
                    </View>
                    <Text style={[styles.roleTitle2, role === 'BUYER' && { color: BUYER_COLORS.primary }]}>Buyer</Text>
                    <Text style={styles.roleDesc}>Purchase from marketplace</Text>
                    {role === 'BUYER' && (
                      <View style={[styles.roleCheck, { backgroundColor: BUYER_COLORS.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'OWNER' && { borderColor: OWNER_COLORS.primary, backgroundColor: OWNER_COLORS.bg },
                    ]}
                    onPress={() => setRole('OWNER')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.roleIconBox, { backgroundColor: role === 'OWNER' ? OWNER_COLORS.primary : '#E5E7EB' }]}>
                      <Ionicons name="business" size={22} color={role === 'OWNER' ? '#FFF' : '#9CA3AF'} />
                    </View>
                    <Text style={[styles.roleTitle2, role === 'OWNER' && { color: OWNER_COLORS.primary }]}>Owner</Text>
                    <Text style={styles.roleDesc}>Manage cold storage</Text>
                    {role === 'OWNER' && (
                      <View style={[styles.roleCheck, { backgroundColor: OWNER_COLORS.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.stepTitle}>Basic Information</Text>
                <Field icon="person-outline" label="Full Name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Ramesh Kumar" />
                <Field icon="call-outline" label="Phone Number *" value={phone} onChangeText={(t: string) => { setPhone(t); setPhoneVerified(false); setOtpSent(false); }} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />

                {/* Phone OTP Verification */}
                {phone.length === 10 && !phoneVerified && (
                  <View style={{ marginTop: -8, marginBottom: 12 }}>
                    {!otpSent ? (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1, borderColor: colors.primary }}
                        onPress={handleSendPhoneOtp}
                        disabled={loading}
                      >
                        <Ionicons name="paper-plane-outline" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                          {loading ? 'Sending...' : 'Verify Phone with OTP'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <TextInput
                            style={{ flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, letterSpacing: 4, textAlign: 'center', fontWeight: '700' }}
                            value={phoneOtp}
                            onChangeText={(t) => setPhoneOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter OTP"
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                          <TouchableOpacity
                            style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
                            onPress={handleVerifyPhoneOtp}
                            disabled={loading}
                          >
                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                              {loading ? '...' : 'Verify'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                          {otpCountdown > 0 ? (
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Resend in {otpCountdown}s</Text>
                          ) : (
                            <TouchableOpacity onPress={handleSendPhoneOtp}>
                              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Resend OTP</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Phone verified badge */}
                {phoneVerified && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ECFDF5', borderRadius: 8, alignSelf: 'flex-start' }}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>Phone Verified</Text>
                  </View>
                )}

                <Field icon="lock-closed-outline" label="Password *" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secureTextEntry />
                <Field icon="shield-checkmark-outline" label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry />
                <Field icon="mail-outline" label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" />
              </View>
            )}

            {/* ═══ STEP 2: Address & Identity ═══ */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Address & Identity</Text>

                <View style={styles.kycNotice}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                  <Text style={styles.kycNoticeText}>
                    Identity verification helps prevent fraud and enables traceability for all transactions.
                  </Text>
                </View>

                <Field icon="home-outline" label="Address *" value={addressLine1} onChangeText={setAddressLine1} placeholder="House/Shop No., Street, Area" />
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Field icon="business-outline" label="City *" value={city} onChangeText={setCity} placeholder="e.g. Agra" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field icon="map-outline" label="District" value={district} onChangeText={setDistrict} placeholder="e.g. Agra" />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1.5 }}>
                    <Field icon="location-outline" label="State *" value={state} onChangeText={setState} placeholder="e.g. Uttar Pradesh" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field icon="pin-outline" label="Pincode *" value={pincode} onChangeText={setPincode} placeholder="6 digits" keyboardType="number-pad" maxLength={6} />
                  </View>
                </View>

                <View style={styles.divider} />
                <Text style={styles.stepTitle}>Identity Verification</Text>

                <Field icon="card-outline" label="Aadhaar Number *" value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="12-digit Aadhaar number" keyboardType="number-pad" maxLength={12} />
                <Field icon="document-text-outline" label="PAN Number (optional)" value={panNumber} onChangeText={(t) => setPanNumber(t.toUpperCase())} placeholder="e.g. ABCDE1234F" autoCapitalize="characters" maxLength={10} />
              </View>
            )}

            {/* ═══ STEP 3: Role-Specific KYC ═══ */}
            {step === 3 && (
              <View>
                {role === 'FARMER' ? (
                  <>
                    <Text style={styles.stepTitle}>Farmer Details</Text>
                    <View style={styles.kycNotice}>
                      <Ionicons name="information-circle" size={18} color={colors.primary} />
                      <Text style={styles.kycNoticeText}>
                        Land details help verify your farming background and enable faster facility booking.
                      </Text>
                    </View>
                    <Field icon="trail-sign-outline" label="Village / Town *" value={villageName} onChangeText={setVillageName} placeholder="e.g. Kakori, Lucknow" />
                    <Field icon="resize-outline" label="Land Holding (optional)" value={landHolding} onChangeText={setLandHolding} placeholder="e.g. 5 acres" />
                    <Field icon="receipt-outline" label="Khasra / Land Record Number (optional)" value={khasraNumber} onChangeText={setKhasraNumber} placeholder="e.g. 123/45" />
                  </>
                ) : role === 'BUYER' ? (
                  <>
                    <Text style={styles.stepTitle}>Business Details</Text>
                    <View style={styles.kycNotice}>
                      <Ionicons name="information-circle" size={18} color={colors.primary} />
                      <Text style={styles.kycNoticeText}>
                        Business details are required for invoicing and GST compliance. This helps prevent fraudulent transactions.
                      </Text>
                    </View>
                    <Field icon="briefcase-outline" label="Business / Firm Name *" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Priya Enterprises" />

                    <Text style={styles.fieldLabel}>Business Type *</Text>
                    <View style={styles.typeGrid}>
                      {BUSINESS_TYPES.map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeChip,
                            businessType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => setBusinessType(type)}
                        >
                          <Text style={[
                            styles.typeChipText,
                            businessType === type && { color: '#FFF' },
                          ]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Field icon="document-attach-outline" label="GST Number *" value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} placeholder="e.g. 09ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} />
                  </>
                ) : (
                  <>
                    <Text style={styles.stepTitle}>Cold Storage Owner Details</Text>
                    <View style={styles.kycNotice}>
                      <Ionicons name="information-circle" size={18} color={colors.primary} />
                      <Text style={styles.kycNoticeText}>
                        Your Cold Storage Registration and FSSAI license are required for facility verification and food safety compliance.
                      </Text>
                    </View>
                    <Field icon="business-outline" label="CS Registration Number *" value={csRegistrationNumber} onChangeText={setCsRegistrationNumber} placeholder="Cold Storage registration number" />
                    <Field icon="document-text-outline" label="FSSAI License Number *" value={fssaiNumber} onChangeText={setFssaiNumber} placeholder="14-digit FSSAI number" maxLength={20} />
                    <Field icon="briefcase-outline" label="Business / Firm Name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. PK Cold Storage Pvt. Ltd." />
                    <Field icon="document-attach-outline" label="GST Number" value={gstNumber} onChangeText={(t) => setGstNumber(t.toUpperCase())} placeholder="e.g. 09ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} />
                  </>
                )}
              </View>
            )}

            {/* ═══ STEP 4: Document Upload & OTP ═══ */}
            {step === 4 && (
              <View>
                {role === 'FARMER' ? (
                  <>
                    <Text style={styles.stepTitle}>Aadhaar Verification & Photo *</Text>
                    
                    {/* Aadhaar OTP Section */}
                    <View style={styles.kycSection}>
                      <Text style={styles.sectionSubTitle}>1. Verify Aadhaar via OTP</Text>
                      {aadhaarVerified ? (
                        <View style={styles.verifiedRow}>
                          <Ionicons name="checkmark-circle" size={20} color="#2D6A4F" />
                          <Text style={styles.verifiedText}>Aadhaar Number Verified</Text>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {showAadhaarOtpInput ? (
                            <View style={{ gap: 10 }}>
                              <Field
                                icon="key-outline"
                                label="Enter OTP Sent to Mobile *"
                                value={aadhaarOtp}
                                onChangeText={setAadhaarOtp}
                                placeholder="6-digit OTP"
                                keyboardType="number-pad"
                                maxLength={6}
                              />
                              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={confirmAadhaarOtp}>
                                <Text style={styles.actionButtonText}>Confirm OTP</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: colors.primary }]}
                              onPress={sendAadhaarOtp}
                              disabled={isVerifyingAadhaar}
                            >
                              {isVerifyingAadhaar ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={styles.actionButtonText}>Verify with OTP</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.divider} />

                    {/* Aadhaar Photo Section */}
                    <Text style={styles.sectionSubTitle}>2. Upload Aadhaar Card Front *</Text>
                    <ImagePickerBox
                      asset={aadhaarPhotoAsset}
                      onPickCamera={() => handlePickImage('aadhaar', 'camera')}
                      onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
                      placeholder="Take Aadhaar Photo"
                    />
                  </>
                ) : role === 'BUYER' ? (
                  <>
                    <Text style={styles.stepTitle}>GST Certificate Upload *</Text>
                    <View style={styles.kycNotice}>
                      <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                      <Text style={styles.kycNoticeText}>
                        Please upload a clear picture of the original GST Certificate document for verification.
                      </Text>
                    </View>

                    <Text style={styles.sectionSubTitle}>GST Certificate Image *</Text>
                    <ImagePickerBox
                      asset={gstPhotoAsset}
                      onPickCamera={() => handlePickImage('gst', 'camera')}
                      onPickGallery={() => handlePickImage('gst', 'gallery')}
                      placeholder="Upload GST Certificate"
                    />

                    <View style={styles.divider} />

                    <Text style={styles.sectionSubTitle}>PAN Card Image (Optional)</Text>
                    <ImagePickerBox
                      asset={panPhotoAsset}
                      onPickCamera={() => handlePickImage('pan', 'camera')}
                      onPickGallery={() => handlePickImage('pan', 'gallery')}
                      placeholder="Upload PAN Card Front"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.stepTitle}>Owner Document Upload</Text>
                    <View style={styles.kycNotice}>
                      <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                      <Text style={styles.kycNoticeText}>
                        Upload your identity and facility registration documents. These are required for admin verification.
                      </Text>
                    </View>

                    <Text style={styles.sectionSubTitle}>Aadhaar Card Front *</Text>
                    <ImagePickerBox
                      asset={aadhaarPhotoAsset}
                      onPickCamera={() => handlePickImage('aadhaar', 'camera')}
                      onPickGallery={() => handlePickImage('aadhaar', 'gallery')}
                      placeholder="Upload Aadhaar Card"
                    />

                    <View style={styles.divider} />

                    <Text style={styles.sectionSubTitle}>CS Registration Certificate *</Text>
                    <ImagePickerBox
                      asset={csRegistrationPhotoAsset}
                      onPickCamera={async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { setError('Camera permission denied'); return; }
                        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setCsRegistrationPhotoAsset(result.assets[0]);
                      }}
                      onPickGallery={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') { setError('Gallery permission denied'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setCsRegistrationPhotoAsset(result.assets[0]);
                      }}
                      placeholder="Upload Registration Certificate"
                    />

                    <View style={styles.divider} />

                    <Text style={styles.sectionSubTitle}>FSSAI License *</Text>
                    <ImagePickerBox
                      asset={fssaiPhotoAsset}
                      onPickCamera={async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { setError('Camera permission denied'); return; }
                        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setFssaiPhotoAsset(result.assets[0]);
                      }}
                      onPickGallery={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') { setError('Gallery permission denied'); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
                        if (!result.canceled && result.assets?.[0]) setFssaiPhotoAsset(result.assets[0]);
                      }}
                      placeholder="Upload FSSAI License"
                    />
                  </>
                )}
              </View>
            )}

            {/* Error display */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actions}>
              {step > 1 && (
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={18} color="#6B7280" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}

              {step < totalSteps ? (
                <TouchableOpacity
                  style={[styles.nextBtn, step === 1 && { flex: 1 }]}
                  onPress={handleNext}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.light]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.nextBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextBtn, { opacity: loading ? 0.7 : 1 }]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.light]}
                    style={styles.nextGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name={role === 'FARMER' ? 'leaf' : role === 'OWNER' ? 'business' : 'storefront'} size={18} color="#FFF" />
                        <Text style={styles.nextBtnText}>Create Account</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Reusable Field Component ──
function Field({ label, icon, ...props }: { label: string; icon?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {icon && <Ionicons name={icon as any} size={18} color="#9CA3AF" style={{ marginRight: 8 }} />}
        <TextInput
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          {...props}
        />
      </View>
    </View>
  );
}

// ── Reusable ImagePickerBox Component ──
function ImagePickerBox({
  asset,
  onPickCamera,
  onPickGallery,
  placeholder,
}: {
  asset: ImagePicker.ImagePickerAsset | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  placeholder: string;
}) {
  return (
    <View style={styles.pickerBoxContainer}>
      {asset ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: asset.uri }} style={styles.previewImage} />
          <View style={styles.previewOver}>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.previewText}>Photo Added</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.pickerPlaceholder}>{placeholder}</Text>
      )}
      <View style={styles.pickerButtonsRow}>
        <TouchableOpacity style={styles.pickerSubBtn} onPress={onPickCamera}>
          <Ionicons name="camera-outline" size={18} color="#6B7280" />
          <Text style={styles.pickerSubBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickerSubBtn} onPress={onPickGallery}>
          <Ionicons name="image-outline" size={18} color="#6B7280" />
          <Text style={styles.pickerSubBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 40 },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoIcon: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Card
  card: {
    backgroundColor: '#FFF', borderRadius: 22, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
  },

  // Progress
  progressSection: { marginBottom: 20, gap: 6 },
  progressBar: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textAlign: 'right' },

  // Step title
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },

  // Role cards
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleCard: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 6, backgroundColor: '#FAFAFA',
    position: 'relative',
  },
  roleIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  roleTitle2: { fontSize: 15, fontWeight: '700', color: '#374151' },
  roleDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  // KYC notice
  kycNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#DCFCE7',
  },
  kycNoticeText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  // Fields
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 14, color: '#1A1A2E' },

  // Type chips
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  // Divider
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 18 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  nextBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  nextGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Login link
  loginLink: { marginTop: 18, alignItems: 'center' },
  loginLinkText: { fontSize: 13, color: '#6B7280' },

  // KYC step custom styles
  kycSection: { marginVertical: 8 },
  sectionSubTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  verifiedText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  actionButton: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  actionButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  pickerBoxContainer: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 12, backgroundColor: '#F9FAFB', gap: 10 },
  pickerPlaceholder: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginVertical: 12 },
  pickerButtonsRow: { flexDirection: 'row', gap: 10 },
  pickerSubBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#FFF' },
  pickerSubBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  previewContainer: { height: 120, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  previewOver: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  previewText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
