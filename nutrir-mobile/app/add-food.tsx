import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, Plus, Minus, Check } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface Food {
  id: number;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  unit?: string;
  serving_size?: number;
}

const MEAL_TYPES = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'lanche_manha', label: 'Lanche manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche_tarde', label: 'Lanche tarde' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

function calcMacros(food: Food, grams: number) {
  const f = grams / 100;
  return {
    calories: Math.round(food.calories_per_100g * f),
    protein: Math.round(food.protein_per_100g * f * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * f * 10) / 10,
    fats: Math.round(food.fats_per_100g * f * 10) / 10,
  };
}

export default function AddFoodScreen() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState('almoco');
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();


  // Debounce search
  const onSearchChange = useCallback((text: string) => {
    setSearch(text);
    clearTimeout((onSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer);
    (onSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(
      () => setDebouncedSearch(text),
      400
    );
  }, []);

  const { data: results, isFetching } = useQuery<Food[]>({
    queryKey: ['food-search', debouncedSearch],
    queryFn: () =>
      debouncedSearch.length >= 2
        ? api.get('/user/food-search', { params: { q: debouncedSearch } }).then((r) => r.data)
        : Promise.resolve([]),
    enabled: debouncedSearch.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (payload: { food_id: number; grams: number; meal_type: string }) =>
      api.post('/diario/add-food', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      Alert.alert('Adicionado!', 'Alimento registrado no diário.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível registrar o alimento.'),
  });

  const macros = selectedFood ? calcMacros(selectedFood, grams) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Buscar alimento</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Digite o alimento..."
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="search"
        />
        {isFetching && <ActivityIndicator color={colors.accentGreen} size="small" />}
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.foodItem}
            onPress={() => { setSelectedFood(item); setGrams(item.serving_size ?? 100); }}
            activeOpacity={0.8}
          >
            <View style={styles.foodItemLeft}>
              <Text style={styles.foodItemName}>{item.name}</Text>
              <Text style={styles.foodItemMeta}>
                {item.calories_per_100g} kcal / 100g
              </Text>
            </View>
            <Plus size={18} color={colors.accentGreen} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          debouncedSearch.length >= 2 && !isFetching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum resultado para "{debouncedSearch}"</Text>
            </View>
          ) : debouncedSearch.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Digite ao menos 2 letras para buscar</Text>
            </View>
          ) : null
        }
      />

      {/* Food detail modal */}
      <Modal visible={!!selectedFood} transparent animationType="slide">
        {selectedFood && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
              <Text style={styles.modalFoodName}>{selectedFood.name}</Text>

              {/* Macros preview */}
              {macros && (
                <View style={styles.macrosRow}>
                  <View style={styles.macroBox}>
                    <Text style={styles.macroVal}>{macros.calories}</Text>
                    <Text style={styles.macroLbl}>kcal</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.protein }]}>{macros.protein}g</Text>
                    <Text style={styles.macroLbl}>prot</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.carbs }]}>{macros.carbs}g</Text>
                    <Text style={styles.macroLbl}>carb</Text>
                  </View>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.fats }]}>{macros.fats}g</Text>
                    <Text style={styles.macroLbl}>gord</Text>
                  </View>
                </View>
              )}

              {/* Quantity */}
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Quantidade (g)</Text>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    onPress={() => setGrams((g) => Math.max(5, g - 25))}
                    style={styles.qtyBtn}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{grams}g</Text>
                  <TouchableOpacity
                    onPress={() => setGrams((g) => g + 25)}
                    style={styles.qtyBtn}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meal type */}
              <Text style={styles.qtyLabel}>Refeição</Text>
              <View style={styles.mealGrid}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.mealChip, mealType === m.key && styles.mealChipActive]}
                    onPress={() => setMealType(m.key)}
                  >
                    <Text style={[styles.mealChipText, mealType === m.key && styles.mealChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFood(null)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, mutation.isPending && styles.confirmBtnDisabled]}
                  onPress={() =>
                    mutation.mutate({
                      food_id: selectedFood.id,
                      grams,
                      meal_type: mealType,
                    })
                  }
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? <ActivityIndicator color="#000" size="small" />
                    : <><Check size={16} color="#000" /><Text style={styles.confirmText}>Adicionar</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.textPrimary, paddingVertical: 13, fontSize: 15 },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  foodItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodItemLeft: { flex: 1 },
  foodItemName: { ...typography.label, color: colors.textPrimary, fontSize: 14 },
  foodItemMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalFoodName: { ...typography.h3, color: colors.textPrimary },

  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroBox: { alignItems: 'center', gap: 2 },
  macroVal: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  macroLbl: { ...typography.caption, color: colors.textMuted },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { ...typography.label, color: colors.textSecondary },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { ...typography.h3, color: colors.textPrimary, minWidth: 52, textAlign: 'center' },

  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bgSecondary,
  },
  mealChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  mealChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  mealChipTextActive: { color: '#000' },

  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontWeight: '700', color: '#000', fontSize: 15 },
});
