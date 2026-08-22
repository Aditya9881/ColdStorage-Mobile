/**
 * AuthModalShell — Base modal wrapper for auth flows
 *
 * Centered overlay with:
 * - Dark scrim background
 * - White rounded card (max-width on tablets)
 * - Close "X" in top-right corner
 * - KeyboardAvoidingView for input handling
 * - ScrollView for overflow content
 * - Android back button support via onRequestClose
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

interface AuthModalShellProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** If true, closing shows "Discard changes?" confirmation */
  showCloseConfirm?: boolean;
}

export default function AuthModalShell({
  visible,
  onClose,
  children,
  showCloseConfirm = false,
}: AuthModalShellProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  const handleClose = () => {
    if (showCloseConfirm) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved progress. Are you sure you want to close?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                marginTop: insets.top + 24,
                marginBottom: insets.bottom + 24,
              },
            ]}
          >
            {/* Close X */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color="#5F6B66" />
            </TouchableOpacity>

            {/* Scrollable content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 32, 0.50)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: Math.min(SCREEN_W - 32, 420),
    maxHeight: SCREEN_H * 0.88,
    position: 'relative',
    shadowColor: '#0B2520',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E8ECE9',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8E4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
  },
});
