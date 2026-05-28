import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, Users, BookmarkPlus, Plus } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface Ingredient {
  name: string;
  quantity: string;
}

interface RecipeDetailData {
  id: number;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prep_time: number;
  servings: number;
  difficulty: string;
  category?: string;
  tags?: string[];
  ingredients: Ingredient[];
  steps: string[];
  tips?: string;
  source?: string;
}

export default function RecipeDetailScreen() {
  const { id, data: rawData } = useLocalSearchParams<{ id?: string; data?: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Support both fetching by ID and passing pre-fetched data (from AI generator)
  const preloaded: RecipeDetailData | null = rawData ? JSON.parse(rawData) : null;

  const { data: fetched, isLoading } = useQuery<RecipeDetailData>({
    queryKey: ['recipe', id],
    queryFn: () => api.get(`/recipes/${id}`).then((r) => r.data),
    enabled: !!id && !preloaded,
  });

  const recipe = preloaded ?? fetched;

  const saveMutation = useMutation({
    mutationFn: () => api.post('/recipes/save', { recipe }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      Alert.alert('Salvo!', 'Receita adicionada às suas receitas.');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível salvar a receita.'),
  });

  const addToDiaryMutation = useMutation({
    mutationFn: (mealType: string) =>
      api.post('/diario/add-recipe', { recipe_id: recipe?.id, meal_type: mealType }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      Alert.alert('Adicionado!', 'Receita registrada no diário de hoje.');
    },
  });

  const handleAddToDiary = () => {
    Alert.alert('Adicionar ao diário', 'Selecione a refeição', [
      { text: 'Café da manhã', onPress: () => addToDiaryMutation.mutate('cafe') },
      { text: 'Almoço', onPress: () => addToDiaryMutation.mutate('almoco') },
      { text: 'Jantar', onPress: () => addToDiaryMutation.mutate('jantar') },
      { text: 'Lanche', onPress: () => addToDiaryMutation.mutate('lanche_tarde') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {preloaded && (
            <TouchableOpacity onPress={() => saveMutation.mutate()} style={styles.iconBtn} hitSlop={8} disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? <ActivityIndicator size="small" color={colors.accentGreen} />
                : <BookmarkPlus size={22} color={colors.accentGreen} />
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleAddToDiary} style={styles.addDiaryBtn} activeOpacity={0.85}>
            <Plus size={14} color="#000" />
            <Text style={styles.addDiaryText}>Diário</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} size="large" />
        </View>
      ) : !recipe ? (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Receita não encontrada.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title & meta */}
          <Text style={styles.title}>{recipe.name}</Text>
          {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Clock size={14} color={colors.accentGreen} />
              <Text style={styles.metaText}>{recipe.prep_time} min</Text>
            </View>
            <View style={styles.metaChip}>
              <Users size={14} color={colors.accentGreen} />
              <Text style={styles.metaText}>{recipe.servings} porções</Text>
            </View>
            <View style={styles.diffChip}>
              <Text style={styles.diffText}>{recipe.difficulty}</Text>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macroCard}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.calories}</Text>
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.protein }]}>{recipe.protein}g</Text>
              <Text style={styles.macroLabel}>proteína</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.carbs }]}>{recipe.carbs}g</Text>
              <Text style={styles.macroLabel}>carb</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.fats }]}>{recipe.fats}g</Text>
              <Text style={styles.macroLabel}>gordura</Text>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            <View style={styles.ingredientList}>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientQty}>{ing.quantity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modo de preparo</Text>
            <View style={styles.stepList}>
              {recipe.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tips */}
          {recipe.tips && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Dica do Chef</Text>
              <Text style={styles.tipsText}>{recipe.tips}</Text>
            </View>
          )}
        </ScrollView>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 6 },
  addDiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addDiaryText: { fontSize: 12, fontWeight: '700', color: '#000' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.textSecondary },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  title: { ...typography.h2, color: colors.textPrimary, lineHeight: 30 },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  diffChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diffText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },

  macroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  macroLabel: { ...typography.caption, color: colors.textMuted },
  macroDivider: { width: 1, backgroundColor: colors.border },

  section: { gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },

  ingredientList: { gap: 8 },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentGreen,
    flexShrink: 0,
  },
  ingredientName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  ingredientQty: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },

  stepList: { gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: { fontSize: 13, fontWeight: '800', color: '#000' },
  stepText: { ...typography.body, color: colors.textPrimary, flex: 1, lineHeight: 22 },

  tipsCard: {
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    gap: 6,
  },
  tipsTitle: { ...typography.label, color: colors.accentGreen },
  tipsText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
});
