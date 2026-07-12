/**
 * ColdStorage — Premium Login Screen
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Flow:
 *   Step 1: Enter phone → "Send OTP"
 *   Step 2: Enter 6-digit OTP → auto-verify → logged in
 *   Alt:    "Login with Password" toggle (backward compat + dev creds)
 *
 * Design:
 * - Deep forest-to-teal gradient mesh background
 * - Animated floating snowflake particles
 * - Glassmorphic form card
 * - Individual OTP box cells with pulsing cursor
 * - GradientButton with glow shadow
 * - Trust badges at bottom
 * - Dev credentials as subtle collapsible section
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated as RNAnimated, Keyboard, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  Colors, Spacing, BorderRadius, FontSize, FontWeight,
  Shadows, Gradients, FontFamily,
} from '@/constants/Colors';
import { hapticLight, hapticError, hapticSuccess } from '@/lib/haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type LoginStep = 'phone' | 'otp' | 'password';

// ── Floating Snowflake Particle ──
function FloatingParticle({ delay, x, size, duration }: { delay: number; x: number; size: number; duration: number }) {
  const translateY = useRef(new RNAnimated.Value(SCREEN_H + 20)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const rotate = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.parallel([
          RNAnimated.timing(translateY, { toValue: -40, duration, useNativeDriver: true }),
          RNAnimated.sequence([
            RNAnimated.timing(opacity, { toValue: 0.35, duration: duration * 0.2, useNativeDriver: true }),
            RNAnimated.timing(opacity, { toValue: 0.35, duration: duration * 0.6, useNativeDriver: true }),
            RNAnimated.timing(opacity, { toValue: 0, duration: duration * 0.2, useNativeDriver: true }),
          ]),
          RNAnimated.timing(rotate, { toValue: 1, duration, useNativeDriver: true }),
        ]),
        RNAnimated.timing(translateY, { toValue: SCREEN_H + 20, duration: 0, useNativeDriver: true }),
        RNAnimated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <RNAnimated.View style={{
      position: 'absolute', left: x, width: size, height: size,
      transform: [{ translateY }, { rotate: spin }],
      opacity,
    }}>
      <Ionicons name="snow" size={size} color="rgba(255,255,255,0.5)" />
    </RNAnimated.View>
  );
}

const PARTICLES = [
  { delay: 0, x: SCREEN_W * 0.1, size: 14, duration: 8000 },
  { delay: 2000, x: SCREEN_W * 0.35, size: 10, duration: 10000 },
  { delay: 4000, x: SCREEN_W * 0.65, size: 16, duration: 7000 },
  { delay: 1000, x: SCREEN_W * 0.85, size: 12, duration: 9000 },
  { delay: 3000, x: SCREEN_W * 0.5, size: 8, duration: 11000 },
];

export default function LoginScreen() {
  const { login, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  // ── State ──
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showDevCreds, setShowDevCreds] = useState(false);

  const otpInputRef = useRef<TextInput>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animations ──
  const logoScale = useRef(new RNAnimated.Value(0.6)).current;
  const logoOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardTranslate = useRef(new RNAnimated.Value(40)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const otpCursorAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(logoScale, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }),
      RNAnimated.timing(logoOpacity, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      RNAnimated.timing(cardTranslate, {
        toValue: 0, duration: 500, delay: 200, useNativeDriver: true,
      }),
      RNAnimated.timing(cardOpacity, {
        toValue: 1, duration: 500, delay: 200, useNativeDriver: true,
      }),
    ]).start();

    // OTP cursor blink
    const cursorBlink = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(otpCursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        RNAnimated.timing(otpCursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    cursorBlink.start();
    return () => cursorBlink.stop();
  }, []);

  // ── Countdown Timer ──
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  // ── Send OTP ──
  const handleSendOtp = useCallback(async () => {
    Keyboard.dismiss();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      hapticError();
      return;
    }
    setError('');
    setLoading(true);
    hapticLight();
    try {
      const result = await sendOtp(phone, 'LOGIN');
      setStep('otp');
      setCountdown(30);
      hapticSuccess();
      if (__DEV__ && (result as any).devOtp) {
        setOtp((result as any).devOtp);
      }
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, sendOtp]);

  // ── Verify OTP ──
  const handleVerifyOtp = useCallback(async (otpValue: string) => {
    if (otpValue.length !== 6) return;
    Keyboard.dismiss();
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await verifyOtp(phone, otpValue, 'LOGIN');
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp('');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, verifyOtp]);

  // ── OTP Input Change (auto-submit on 6 digits) ──
  const handleOtpChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) {
      handleVerifyOtp(cleaned);
    }
  }, [handleVerifyOtp]);

  // ── Password Login ──
  const handlePasswordLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!phone || !password) {
      setError('Please enter phone and password');
      hapticError();
      return;
    }
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      hapticError();
      return;
    }
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await login(phone, password);
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, password, login]);

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    hapticLight();
    try {
      await sendOtp(phone, 'LOGIN');
      setCountdown(30);
      setOtp('');
      hapticSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [phone, countdown, sendOtp]);

  const stepConfig = {
    phone: { title: 'Welcome Back', help: 'Enter your registered phone number' },
    otp: { title: 'Verify Identity', help: `6-digit code sent to +91 ${phone.slice(0, 3)}****${phone.slice(-3)}` },
    password: { title: 'Sign In', help: 'Use your credentials to login' },
  };

  // ── OTP Box Cells ──
  const renderOtpCells = () => (
    <View style={s.otpCellsRow}>
      {[0, 1, 2, 3, 4, 5].map(i => {
        const digit = otp[i];
        const isActive = i === otp.length && otpFocused;
        return (
          <TouchableOpacity
            key={i}
            style={[
              s.otpCell,
              digit ? s.otpCellFilled : {},
              isActive ? s.otpCellActive : {},
            ]}
            onPress={() => otpInputRef.current?.focus()}
            activeOpacity={0.8}
          >
            {digit ? (
              <Text style={s.otpCellText}>{digit}</Text>
            ) : isActive ? (
              <RNAnimated.View style={[s.otpCursor, { opacity: otpCursorAnim }]} />
            ) : null}
          </TouchableOpacity>
        );
      })}
      {/* Hidden input */}
      <TextInput
        ref={otpInputRef}
        style={s.hiddenOtpInput}
        value={otp}
        onChangeText={handleOtpChange}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus={step === 'otp'}
        editable={!loading}
        onFocus={() => setOtpFocused(true)}
        onBlur={() => setOtpFocused(false)}
      />
    </View>
  );

  return (
    <LinearGradient colors={Gradients.mesh as any} style={s.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Floating Snowflake Particles */}
      {PARTICLES.map((p, i) => <FloatingParticle key={i} {...p} />)}

      {/* Grain texture overlay */}
      <View style={s.grainOverlay} />

      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Logo ── */}
          <RNAnimated.View style={[s.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <View style={s.logoGlow}>
              <View style={s.logoIcon}>
                <Ionicons name="snow" size={28} color="#E8BE6A" />
              </View>
            </View>
            <Text style={s.brandName}>ColdStorage</Text>
            <Text style={s.brandHindi}>शीतकोष</Text>
            <Text style={s.tagline}>India's Smart Cold Storage Network</Text>
          </RNAnimated.View>

          {/* ── Form Card ── */}
          <RNAnimated.View style={[s.card, { transform: [{ translateY: cardTranslate }], opacity: cardOpacity }]}>
            <Text style={s.stepTitle}>{stepConfig[step].title}</Text>
            <Text style={s.stepHelp}>{stepConfig[step].help}</Text>

            {/* Error Banner */}
            {error ? (
              <View style={s.errorBanner}>
                <View style={s.errorIconWrap}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                </View>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── PHONE STEP ── */}
            {step === 'phone' && (
              <>
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>PHONE NUMBER</Text>
                  <View style={[s.inputRow, phoneFocused && s.inputRowFocused]}>
                    <View style={s.countryBadge}>
                      <Text style={s.countryFlag}>🇮🇳</Text>
                      <Text style={s.countryCode}>+91</Text>
                    </View>
                    <View style={s.inputSep} />
                    <TextInput
                      style={s.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={true}
                      selectTextOnFocus={true}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                    />
                  </View>
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={Gradients.mesh as any} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Text style={s.primaryBtnText}>Get OTP</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* Password login toggle */}
                <TouchableOpacity
                  style={s.outlineBtn}
                  onPress={() => { setStep('password'); setError(''); hapticLight(); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="lock-closed-outline" size={16} color="#1B5E4A" />
                  <Text style={s.outlineBtnText}>Login with Password</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── OTP STEP ── */}
            {step === 'otp' && (
              <>
                {renderOtpCells()}

                {loading && (
                  <View style={s.verifyingRow}>
                    <ActivityIndicator size="small" color="#1B5E4A" />
                    <Text style={s.verifyingText}>Verifying...</Text>
                  </View>
                )}

                {/* Resend */}
                <View style={s.resendRow}>
                  {countdown > 0 ? (
                    <Text style={s.resendTimer}>
                      Resend code in <Text style={s.resendBold}>{countdown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                      <Text style={s.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Back */}
                <TouchableOpacity
                  style={s.backRow}
                  onPress={() => { setStep('phone'); setOtp(''); setError(''); hapticLight(); }}
                >
                  <Ionicons name="arrow-back" size={14} color="#5F6B7A" />
                  <Text style={s.backText}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── PASSWORD STEP ── */}
            {step === 'password' && (
              <>
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>PHONE NUMBER</Text>
                  <View style={[s.inputRow, phoneFocused && s.inputRowFocused]}>
                    <View style={s.countryBadge}>
                      <Text style={s.countryFlag}>🇮🇳</Text>
                      <Text style={s.countryCode}>+91</Text>
                    </View>
                    <View style={s.inputSep} />
                    <TextInput
                      style={s.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={true}
                      selectTextOnFocus={true}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                    />
                  </View>
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>PASSWORD</Text>
                  <View style={[s.inputRow, passFocused && s.inputRowFocused]}>
                    <Ionicons name="lock-closed-outline" size={17} color={passFocused ? '#1B5E4A' : '#94A3B8'} />
                    <TextInput
                      style={s.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={true}
                      selectTextOnFocus={true}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => { setShowPassword(!showPassword); hapticLight(); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={Gradients.mesh as any} style={s.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Text style={s.primaryBtnText}>Sign In</Text>
                        <Ionicons name="log-in-outline" size={18} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backRow}
                  onPress={() => { setStep('phone'); setError(''); hapticLight(); }}
                >
                  <Ionicons name="arrow-back" size={14} color="#5F6B7A" />
                  <Text style={s.backText}>Login with OTP instead</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Dev Credentials (collapsible) ── */}
            {__DEV__ && (
              <View style={s.devSection}>
                <TouchableOpacity
                  style={s.devToggle}
                  onPress={() => { setShowDevCreds(!showDevCreds); hapticLight(); }}
                >
                  <View style={s.devToggleLine} />
                  <View style={s.devTogglePill}>
                    <Ionicons name="code-slash-outline" size={10} color="#D9A441" />
                    <Text style={s.devToggleText}>DEV</Text>
                    <Ionicons name={showDevCreds ? 'chevron-up' : 'chevron-down'} size={10} color="#94A3B8" />
                  </View>
                  <View style={s.devToggleLine} />
                </TouchableOpacity>

                {showDevCreds && (
                  <View style={s.devCredsWrap}>
                    {[
                      { phone: '9800000001', label: 'Farmer', pw: 'test1234', icon: 'leaf-outline' as const },
                      { phone: '9900000001', label: 'Buyer', pw: 'test1234', icon: 'cart-outline' as const },
                    ].map((cred) => (
                      <TouchableOpacity
                        key={cred.phone}
                        style={s.devCredBtn}
                        onPress={() => {
                          setPhone(cred.phone);
                          setPassword(cred.pw);
                          setStep('password');
                          hapticLight();
                        }}
                      >
                        <View style={[s.devCredIcon, { backgroundColor: cred.label === 'Farmer' ? '#E6F2ED' : '#F0FDFA' }]}>
                          <Ionicons name={cred.icon} size={12} color={cred.label === 'Farmer' ? '#1B5E4A' : '#0F766E'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.devCredLabel}>{cred.label}</Text>
                          <Text style={s.devCredPhone}>{cred.phone} / {cred.pw}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </RNAnimated.View>

          {/* ── Bottom: Register + Trust ── */}
          <RNAnimated.View style={[s.bottomArea, { opacity: cardOpacity }]}>
            <View style={s.registerRow}>
              <Text style={s.registerText}>New to ColdStorage? </Text>
              <TouchableOpacity onPress={() => { router.replace('/(auth)/register'); hapticLight(); }}>
                <Text style={s.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Trust Badges */}
            <View style={s.trustRow}>
              <View style={s.trustBadge}>
                <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.5)" />
                <Text style={s.trustText}>Bank-grade security</Text>
              </View>
              <View style={s.trustDot} />
              <View style={s.trustBadge}>
                <Ionicons name="checkmark-circle-outline" size={12} color="rgba(255,255,255,0.5)" />
                <Text style={s.trustText}>FSSAI Verified</Text>
              </View>
            </View>
          </RNAnimated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  grainOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // ── Logo ──
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGlow: {
    width: 72, height: 72,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(232, 190, 106, 0.12)',
    borderWidth: 1, borderColor: 'rgba(232, 190, 106, 0.2)',
    ...Shadows.glow,
    shadowColor: '#D9A441',
    shadowOpacity: 0.15,
  },
  logoIcon: {
    width: 52, height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FontFamily.extrabold,
    letterSpacing: -0.5,
  },
  brandHindi: {
    fontSize: 16,
    color: '#E8BE6A',
    fontWeight: '500',
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    fontFamily: FontFamily.regular,
    letterSpacing: 0.3,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 24,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: FontFamily.bold,
    letterSpacing: -0.3,
  },
  stepHelp: {
    fontSize: 14,
    color: '#5F6B7A',
    marginTop: 4,
    marginBottom: 20,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },

  // ── Error ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorIconWrap: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
    fontFamily: FontFamily.medium,
    lineHeight: 18,
  },

  // ── Fields ──
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F6B7A',
    marginBottom: 8,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 6,
    backgroundColor: '#FAFAF8',
    gap: 10,
  },
  inputRowFocused: {
    borderColor: '#1B5E4A',
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
    shadowColor: '#1B5E4A',
    shadowOpacity: 0.08,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    fontFamily: FontFamily.semibold,
  },
  inputSep: {
    width: 1,
    height: 22,
    backgroundColor: '#E8E6E1',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    fontFamily: FontFamily.regular,
  },

  // ── OTP Cells ──
  otpCellsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  otpCell: {
    width: 46, height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
    backgroundColor: '#FAFAF8',
    alignItems: 'center', justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: '#1B5E4A',
    backgroundColor: '#E6F2ED',
  },
  otpCellActive: {
    borderColor: '#1B5E4A',
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
    shadowColor: '#1B5E4A',
  },
  otpCellText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B5E4A',
    fontFamily: FontFamily.extrabold,
  },
  otpCursor: {
    width: 2, height: 24,
    borderRadius: 1,
    backgroundColor: '#1B5E4A',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1, height: 1,
    opacity: 0,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verifyingText: {
    fontSize: 13,
    color: '#1B5E4A',
    fontFamily: FontFamily.medium,
  },

  // ── Buttons ──
  primaryBtn: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.glow,
  },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1B5E4A',
    backgroundColor: 'rgba(27, 94, 74, 0.04)',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B5E4A',
    fontFamily: FontFamily.semibold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E6E1',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },

  // ── Resend & Back ──
  resendRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  resendTimer: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: FontFamily.regular,
  },
  resendBold: {
    fontWeight: '700',
    color: '#1B5E4A',
    fontFamily: FontFamily.bold,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E4A',
    fontFamily: FontFamily.semibold,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  backText: {
    fontSize: 13,
    color: '#5F6B7A',
    fontFamily: FontFamily.regular,
  },

  // ── Dev Section ──
  devSection: {
    marginTop: 16,
  },
  devToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devToggleLine: {
    flex: 1, height: 1,
    backgroundColor: '#E8E6E1',
  },
  devTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FBF5E8',
    borderWidth: 1, borderColor: '#E8BE6A40',
  },
  devToggleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D9A441',
    fontFamily: FontFamily.extrabold,
    letterSpacing: 1,
  },
  devCredsWrap: {
    marginTop: 10,
    gap: 6,
  },
  devCredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#FAFAF8',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#E8E6E1',
  },
  devCredIcon: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  devCredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
    fontFamily: FontFamily.bold,
  },
  devCredPhone: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: FontFamily.regular,
    marginTop: 1,
  },

  // ── Bottom ──
  bottomArea: {
    alignItems: 'center',
    marginTop: 28,
    gap: 16,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FontFamily.regular,
  },
  registerLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FontFamily.bold,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.4)',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: FontFamily.medium,
  },
  trustDot: {
    width: 3, height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
