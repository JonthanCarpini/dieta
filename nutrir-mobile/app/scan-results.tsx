import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Plus, Minus } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const MEAL_TYPES = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'lanche_manha', label: 'Lanche manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche_tarde', label: 'Lanche tarde' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

function FoodCard({
  item,
  selected,
  onToggle,
}: {
  item: FoodItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.foodCard, selected && styles.foodCardSelected]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={styles.foodCardLeft}>
        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
          {selected && <Check size={14} color="#000" />}
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>
          <Text style={styles.foodQuantity}>
            {item.quantity}{item.unit}
          </Text>
          <View style={styles.macroRow}>
            <Text style={[styles.macro, { color: colors.protein }]}>P {item.protein}g</Text>
            <Text style={[styles.macro, { color: colors.carbs }]}>C {item.carbs}g</Text>
            <Text style={[styles.macro, { color: colors.fats }]}>G {item.fats}g</Text>
          </View>
        </View>
      </View>
      <Text style={styles.foodCalories}>{item.calories} kcal</Text>
    </TouchableOpacity>
  );
}

export default function ScanResultsScreen() {
  const { results } = useLocalSearchParams<{ results: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  let parsedFoods: FoodItem[] = [];
  try {
    if (results) {
      const parsed = JSON.parse(results);
      // Suporta tanto o array de alimentos direto quanto o objeto completo da IA
      const rawList = Array.isArray(parsed) ? parsed : (parsed?.items || []);
      
      parsedFoods = rawList.map((item: any) => ({
        name: item.name || 'Alimento',
        quantity: Number(item.weight_g || item.quantity || 100),
        unit: item.unit || 'g',
        calories: Math.round(Number(item.calories || 0)),
        protein: Math.round(Number(item.protein || 0)),
        carbs: Math.round(Number(item.carbs || 0)),
        fats: item.fat !== undefined ? Math.round(Number(item.fat)) : Math.round(Number(item.fats || 0)),
      }));
    }
  } catch (err) {
    console.error('Erro ao processar alimentos da IA:', err);
  }

  const foods = parsedFoods;
  const [selected, setSelected] = useState<Set<number>>(new Set(foods.map((_, i) => i)));
  const [mealType, setMealType] = useState('almoco');

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const selectedFoods = foods.filter((_, i) => selected.has(i));
  const totalCal = selectedFoods.reduce((s, f) => s + f.calories, 0);

  const mutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().substring(0, 5);

      const mealNames: Record<string, string> = {
        cafe: 'Café da Manhã',
        lanche_manha: 'Lanche da Manhã',
        almoco: 'Almoço',
        lanche_tarde: 'Lanche da Tarde',
        jantar: 'Jantar',
        ceia: 'Ceia',
      };

      const name = mealNames[mealType] || 'Refeição';
      const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Mapeia para o formato que o backend espera (qty, fat, etc)
      const dbItems = selectedFoods.map((f) => ({
        name: f.name,
        qty: f.quantity,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fats,
      }));

      const total = {
        calories: Math.round(dbItems.reduce((sum, item) => sum + item.calories, 0)),
        protein: Math.round(dbItems.reduce((sum, item) => sum + item.protein, 0)),
        carbs: Math.round(dbItems.reduce((sum, item) => sum + item.carbs, 0)),
        fat: Math.round(dbItems.reduce((sum, item) => sum + item.fat, 0)),
      };

      return api.post('/user/meals', {
        id: mealId,
        date: dateStr,
        time: timeStr,
        name,
        items: dbItems,
        total,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      Alert.alert('Adicionado!', `${selectedFoods.length} alimento(s) registrado(s) no diário.`, [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    },
    onError: (err: any) => {
      console.error('Erro ao salvar alimentos:', err);
      Alert.alert('Erro', 'Não foi possível salvar os alimentos.');
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Resultado da análise</Text>
        <View style={{ width: 24 }} />
      </View>

      {foods.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum alimento identificado.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {/* Meal type selector */}
            <Text style={styles.sectionLabel}>Refeição</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealScroll}>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.mealChip, mealType === m.key && styles.mealChipActive]}
                  onPress={() => setMealType(m.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.mealChipText, mealType === m.key && styles.mealChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Food list */}
            <Text style={styles.sectionLabel}>Alimentos identificados</Text>
            <View style={styles.foodList}>
              {foods.map((food, i) => (
                <FoodCard
                  key={i}
                  item={food}
                  selected={selected.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>{selected.size} alimento(s) selecionado(s)</Text>
              <Text style={styles.footerCalories}>{totalCal} kcal total</Text>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, (mutation.isPending || selected.size === 0) && styles.addBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending || selected.size === 0}
              activeOpacity={0.85}
            >
              {mutation.isPending
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.addBtnText}>Adicionar ao diário</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { ...typography.h3, color: colors.textPrimary },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },

  sectionLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm },

  mealScroll: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  mealChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  mealChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  mealChipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  mealChipTextActive: { color: '#000' },

  foodList: { gap: spacing.sm },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodCardSelected: { borderColor: colors.accentGreenDim },
  foodCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  foodInfo: { flex: 1, gap: 2 },
  foodName: { ...typography.label, color: colors.textPrimary, fontSize: 14 },
  foodQuantity: { ...typography.caption, color: colors.textMuted },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  macro: { fontSize: 11, fontWeight: '600' },
  foodCalories: { fontSize: 15, fontWeight: '700', color: colors.accentGreen },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  footerLabel: { ...typography.bodySmall, color: colors.textSecondary },
  footerCalories: { ...typography.label, color: colors.textPrimary, fontSize: 16 },
  addBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontWeight: '700', color: '#000', fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.accentGreen, fontWeight: '600' },
});
