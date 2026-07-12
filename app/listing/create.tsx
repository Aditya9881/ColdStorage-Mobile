import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api-client';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/Colors';

type WizardStep = 1 | 2 | 3;

export default function CreateListingScreen() {
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [step, setStep] = useState<WizardStep>(1);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [price, setPrice] = useState('');
  const [minQty, setMinQty] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mandiSuggestion, setMandiSuggestion] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLots() {
      try {
        const res = await api.get<any>('/inventory/my-lots?limit=50');
        if (res.success && res.data?.lots) {
          // Only show lots that can be listed (STORED or PARTIALLY_RELEASED)
          setLots(res.data.lots.filter((l: any) =>
            l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED'
          ));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLots();
  }, []);

  // Fetch mandi price suggestion when lot is selected
  useEffect(() => {
    if (!selectedLot) return;
    async function fetchMandiPrice() {
      try {
        const res = await api.get<any>('/market-prices');
        if (res.success && res.data) {
          const matching = res.data.find(
            (p: any) => p.commodity?.toLowerCase() === selectedLot.commodityName?.toLowerCase()
          );
          if (matching) {
            const firstMandi = matching.mandis?.[0] || {};
            // Convert Quintal rate (100kg) to per kg rate
            const perKgRate = Math.round(Number(firstMandi.modalPrice || matching.modalPrice || 0) / 100);
            if (perKgRate > 0) {
              setMandiSuggestion(perKgRate);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch suggestion rate:', err);
      }
    }
    fetchMandiPrice();
  }, [selectedLot]);

  async function handleSubmit() {
    if (!selectedLot) { Alert.alert('Select Lot', 'Please select a lot to list'); return; }
    if (!price || isNaN(parseFloat(price))) { Alert.alert('Invalid Price', 'Enter a valid price per kg'); return; }

    setSubmitting(true);
    try {
      const res = await api.post<any>('/marketplace/listings', {
        lotId: selectedLot.id,
        askingPricePerKg: price,
        minQuantityKg: minQty || undefined,
        description: description || undefined,
      });
      if (res.success) {
        Alert.alert('Listed!', `${selectedLot.commodityName} is now on the marketplace`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  }

  const nextStep = () => {
    if (step === 1 && !selectedLot) {
      Alert.alert('Selection Required', 'Please choose a lot to list first.');
      return;
    }
    if (step === 2 && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      Alert.alert('Invalid Price', 'Please enter a valid price per kg.');
      return;
    }
    setStep((prev) => (prev + 1) as WizardStep);
  };

  const prevStep = () => {
    setStep((prev) => (prev - 1) as WizardStep);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Wizard Progress Header */}
      <View style={[styles.progressHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.stepsIndicator}>
          <StepIndicator number={1} label="Select Lot" active={step >= 1} completed={step > 1} colors={colors} />
          <View style={[styles.stepLine, { backgroundColor: step > 1 ? colors.primary : colors.border }]} />
          <StepIndicator number={2} label="Set Price" active={step >= 2} completed={step > 2} colors={colors} />
          <View style={[styles.stepLine, { backgroundColor: step > 2 ? colors.primary : colors.border }]} />
          <StepIndicator number={3} label="Review" active={step === 3} completed={false} colors={colors} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* STEP 1: SELECT LOT */}
        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Lot to List</Text>
            {lots.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No lots available for listing. All lots may already be listed or released.
              </Text>
            ) : (
              lots.map(lot => {
                const selected = selectedLot?.id === lot.id;
                return (
                  <TouchableOpacity
                    key={lot.id}
                    style={[
                      styles.lotOption,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? `${colors.primary}05` : colors.card
                      }
                    ]}
                    onPress={() => setSelectedLot(lot)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.lotOptionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.lotName, { color: colors.text }]}>{lot.commodityName}</Text>
                        <Text style={[styles.lotMeta, { color: colors.textSecondary }]}>
                          {lot.lotNumber} • {(Number(lot.currentWeightKg) / 1000).toFixed(1)} MT
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={selected ? colors.primary : colors.textTertiary}
                      />
                    </View>
                    <Text style={[styles.lotFacility, { color: colors.textTertiary }]}>
                      📍 {lot.facility?.name} — Grade {lot.qualityGrade || '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* STEP 2: SET PRICING & QUANTITY */}
        {step === 2 && selectedLot && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Selling Details</Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>Price per kg (₹) *</Text>
                {mandiSuggestion && (
                  <TouchableOpacity
                    style={styles.suggestionBadge}
                    onPress={() => setPrice(String(mandiSuggestion))}
                  >
                    <Text style={styles.suggestionText}>Use Mandi rate: ₹{mandiSuggestion}/kg</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 15"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Minimum Order Quantity (kg)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={minQty}
                onChangeText={setMinQty}
                placeholder="Optional — e.g. 500"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description / Quality details</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe freshness, specific variety details..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* STEP 3: REVIEW & PUBLISH */}
        {step === 3 && selectedLot && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Listing</Text>

            <View style={[styles.preview, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>Listing Preview Card</Text>
              <Text style={[styles.previewCommodity, { color: colors.text }]}>{selectedLot.commodityName}</Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                {(Number(selectedLot.currentWeightKg) / 1000).toFixed(1)} MT available • Grade {selectedLot.qualityGrade || '—'}
              </Text>
              {price && (
                <Text style={[styles.previewPrice, { color: colors.primary }]}>
                  ₹{parseFloat(price).toFixed(0)}/kg • Total value ≈ ₹{(parseFloat(price) * Number(selectedLot.currentWeightKg)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
              )}
            </View>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Facility Location:</Text>
                <Text style={[styles.confirmValue, { color: colors.text }]}>{selectedLot.facility?.name}</Text>
              </View>
              {minQty ? (
                <View style={styles.confirmRow}>
                  <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Min. Buy Limit:</Text>
                  <Text style={[styles.confirmValue, { color: colors.text }]}>{minQty} kg</Text>
                </View>
              ) : null}
              {description ? (
                <View style={styles.confirmRow}>
                  <Text style={[styles.confirmLabel, { color: colors.textSecondary }]}>Description:</Text>
                  <Text style={[styles.confirmValue, { color: colors.text }]}>{description}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Actions Footer */}
      <View style={[styles.footerActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {step > 1 ? (
          <TouchableOpacity style={[styles.navBtn, styles.backBtn, { borderColor: colors.border }]} onPress={prevStep}>
            <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
            <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity style={[styles.navBtn, styles.nextBtn, { backgroundColor: colors.primary }]} onPress={nextStep}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>Publish Listing</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function StepIndicator({ number, label, active, completed, colors }: any) {
  return (
    <View style={styles.stepContainer}>
      <View
        style={[
          styles.stepBubble,
          {
            backgroundColor: completed
              ? colors.primary
              : active
              ? `${colors.primary}15`
              : colors.background,
            borderColor: completed || active ? colors.primary : colors.border,
          },
        ]}
      >
        {completed ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : (
          <Text
            style={[
              styles.stepNumber,
              { color: active ? colors.primary : colors.textSecondary },
            ]}
          >
            {number}
          </Text>
        )}
      </View>
      <Text
        style={[
          styles.stepLabel,
          {
            color: active ? colors.text : colors.textSecondary,
            fontWeight: active ? 'bold' : 'normal',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressHeader: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
    gap: 4,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  stepLabel: {
    fontSize: 10,
  },
  stepLine: {
    height: 1.5,
    flex: 1,
    marginHorizontal: 8,
    marginTop: -16,
  },
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
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl },
  lotOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  lotOptionHeader: { flexDirection: 'row', alignItems: 'center' },
  lotName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  lotMeta: { fontSize: FontSize.sm, marginTop: 2 },
  lotFacility: { fontSize: FontSize.xs, marginTop: Spacing.sm },
  inputGroup: { marginBottom: Spacing.lg },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  suggestionBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  suggestionText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: FontWeight.semibold,
  },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md },
  textArea: { textAlignVertical: 'top', minHeight: 80 },
  preview: { borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.md },
  previewTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  previewCommodity: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  previewDetail: { fontSize: FontSize.sm, marginTop: 4 },
  previewPrice: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  confirmDetails: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    fontSize: FontSize.sm,
  },
  confirmValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  footerActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1,
  },
  nextBtn: {
    flex: 2,
  },
  navBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
