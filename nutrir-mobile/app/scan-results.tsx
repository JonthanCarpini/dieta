import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Plus, Minus, Edit3 } from 'lucide-react-native';
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
  onEdit,
}: {
  item: FoodItem;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={[styles.foodCard, selected && styles.foodCardSelected]}>
      <TouchableOpacity
        style={styles.foodCardLeft}
        onPress={onToggle}
        activeOpacity={0.8}
      >
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
      </TouchableOpacity>
      
      <View style={styles.foodCardRight}>
        <Text style={styles.foodCalories}>{item.calories} kcal</Text>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={8} activeOpacity={0.7}>
          <Edit3 size={15} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ScanResultsScreen() {
  const { results } = useLocalSearchParams<{ results: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    let parsedFoods: FoodItem[] = [];
    try {
      if (results) {
        const parsed = JSON.parse(results);
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
    return parsedFoods;
  });

  const [selected, setSelected] = useState<Set<number>>(() => new Set(foods.map((_, i) => i)));
  const [mealType, setMealType] = useState('almoco');

  // Estados de Edição do Alimento
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFats, setEditFats] = useState('');

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const handleEditPress = (index: number) => {
    const f = foods[index];
    setEditingIndex(index);
    setEditName(f.name);
    setEditQty(String(f.quantity));
    setEditCalories(String(f.calories));
    setEditProtein(String(f.protein));
    setEditCarbs(String(f.carbs));
    setEditFats(String(f.fats));
    setEditModalVisible(true);
  };

  const adjustQuantity = (amount: number) => {
    const currentQty = Number(editQty) || 100;
    const nextQty = Math.max(10, currentQty + amount);
    const ratio = nextQty / currentQty;

    setEditQty(String(nextQty));
    setEditCalories(String(Math.round((Number(editCalories) || 0) * ratio)));
    setEditProtein(String(Math.round((Number(editProtein) || 0) * ratio)));
    setEditCarbs(String(Math.round((Number(editCarbs) || 0) * ratio)));
    setEditFats(String(Math.round((Number(editFats) || 0) * ratio)));
  };

  const saveFoodEdit = () => {
    if (editingIndex === null) return;
    
    const qty = Number(editQty) || 100;
    const calories = Number(editCalories) || 0;
    const protein = Number(editProtein) || 0;
    const carbs = Number(editCarbs) || 0;
    const fats = Number(editFats) || 0;

    setFoods((prev) => {
      const next = [...prev];
      next[editingIndex] = {
        ...next[editingIndex],
        name: editName,
        quantity: qty,
        calories,
        protein,
        carbs,
        fats,
      };
      return next;
    });
    setEditModalVisible(false);
    setEditingIndex(null);
  };

  const selectedFoods = foods.filter((_, i) => selected.has(i));
  const totalCal = selectedFoods.reduce((s, f) => s + f.calories, 0);
  const totalPro = selectedFoods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = selectedFoods.reduce((s, f) => s + f.carbs, 0);
  const totalFats = selectedFoods.reduce((s, f) => s + f.fats, 0);

  const mutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      // Formatação local YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
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

            {/* Resumo de Macros da Refeição */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTitleRow}>
                <Text style={styles.summaryTitle}>Resumo da Refeição</Text>
                <Text style={styles.summaryCalories}>{totalCal} kcal</Text>
              </View>
              <View style={styles.summaryMacrosRow}>
                <View style={[styles.summaryMacro, { borderBottomColor: colors.protein }]}>
                  <Text style={styles.summaryMacroVal}>{totalPro}g</Text>
                  <Text style={styles.summaryMacroLabel}>Proteína</Text>
                </View>
                <View style={[styles.summaryMacro, { borderBottomColor: colors.carbs }]}>
                  <Text style={styles.summaryMacroVal}>{totalCarbs}g</Text>
                  <Text style={styles.summaryMacroLabel}>Carbo</Text>
                </View>
                <View style={[styles.summaryMacro, { borderBottomColor: colors.fats }]}>
                  <Text style={styles.summaryMacroVal}>{totalFats}g</Text>
                  <Text style={styles.summaryMacroLabel}>Gordura</Text>
                </View>
              </View>
            </View>

            {/* Food list */}
            <Text style={styles.sectionLabel}>Alimentos identificados</Text>
            <View style={styles.foodList}>
              {foods.map((food, i) => (
                <FoodCard
                  key={i}
                  item={food}
                  selected={selected.has(i)}
                  onToggle={() => toggle(i)}
                  onEdit={() => handleEditPress(i)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Footer com calorias destacadas */}
          <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
            <View style={styles.footerTextContainer}>
              <Text style={styles.footerLabel}>{selected.size} alimento(s) selecionado(s)</Text>
              <Text style={styles.footerCaloriesHighlight}>{totalCal} kcal total</Text>
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

          {/* Modal de Edição de Alimento */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Editar Alimento</Text>

                {/* Nome */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nome do alimento"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Quantidade em gramas */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantidade (g)</Text>
                  <View style={styles.quantityEditRow}>
                    <TouchableOpacity style={styles.adjBtn} onPress={() => adjustQuantity(-50)}>
                      <Text style={styles.adjBtnText}>-50g</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adjBtn} onPress={() => adjustQuantity(-10)}>
                      <Text style={styles.adjBtnText}>-10</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, { flex: 1, textAlign: 'center', marginHorizontal: 6 }]}
                      value={editQty}
                      onChangeText={setEditQty}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.adjBtn} onPress={() => adjustQuantity(10)}>
                      <Text style={styles.adjBtnText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adjBtn} onPress={() => adjustQuantity(50)}>
                      <Text style={styles.adjBtnText}>+50g</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Macros e Calorias */}
                <View style={styles.gridRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Calorias (kcal)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editCalories}
                      onChangeText={setEditCalories}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Proteína (g)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editProtein}
                      onChangeText={setEditProtein}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Carbo (g)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editCarbs}
                      onChangeText={setEditCarbs}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Gordura (g)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editFats}
                      onChangeText={setEditFats}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Ações */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setEditModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={saveFoodEdit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summaryCalories: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accentGreen,
  },
  summaryMacrosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryMacro: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
  },
  summaryMacroVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryMacroLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

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
  
  foodCardRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  foodCalories: { fontSize: 15, fontWeight: '700', color: colors.accentGreen },
  editBtn: {
    backgroundColor: colors.bgSecondary,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  footerTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  footerLabel: { ...typography.bodySmall, color: colors.textSecondary },
  footerCaloriesHighlight: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.accentGreen,
    marginTop: 2,
  },
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

  // Estilos do Modal de Edição
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  quantityEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjBtn: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
  },
  adjBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.accentGreen,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
  },
});
