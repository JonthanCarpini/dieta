import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, Zap, Sparkles, RefreshCw, ChevronRight } from 'lucide-react-native';
import api from '../../src/api/client';
import RecipeCard, { Recipe } from '../../src/components/RecipeCard';
import ScreenHeader from '../../src/components/ScreenHeader';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

type Tab = 'nutri' | 'ia' | 'cardapio';

// ─── Tab: Receitas do Nutricionista ────────────────────────────────────────────
function NutriRecipes() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery<Recipe[]>({
    queryKey: ['recipes-nutri'],
    queryFn: () => api.get('/recipes', { params: { source: 'nutricionista' } }).then((r) => r.data),
  });

  const filtered = (data ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.searchBox}>
        <Search size={15} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar receita..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accentGreen} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push({ pathname: '/recipe-detail', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? `Nenhuma receita para "${search}"` : 'Nenhuma receita disponível'}
              </Text>
              {!search && (
                <Text style={styles.emptySubtext}>
                  Seu nutricionista ainda não cadastrou receitas para você.
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Tab: Gerador de Receitas com IA ───────────────────────────────────────────
const GOALS = [
  { key: 'emagrecimento', label: 'Emagrecer' },
  { key: 'ganho_muscular', label: 'Ganhar músculo' },
  { key: 'saude_geral', label: 'Saúde geral' },
  { key: 'energia', label: 'Mais energia' },
];

const MEAL_TYPES = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'jantar', label: 'Jantar' },
];

function AIGenerator() {
  const [preferences, setPreferences] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [goal, setGoal] = useState('saude_geral');
  const [mealType, setMealType] = useState('almoco');
  const [servings, setServings] = useState(2);
  const [result, setResult] = useState<object | null>(null);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/ai/generate-recipe', { preferences, restrictions, goal, meal_type: mealType, servings }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
    onError: () => Alert.alert('Erro', 'Não foi possível gerar a receita. Tente novamente.'),
  });

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.aiContent} showsVerticalScrollIndicator={false}>
      <View style={styles.aiHeader}>
        <Sparkles size={20} color={colors.accentPurple} />
        <Text style={styles.aiTitle}>Gerador de Receitas com IA</Text>
      </View>
      <Text style={styles.aiSubtitle}>Descreva o que você quer e a IA cria uma receita personalizada para você.</Text>

      {/* Preferences */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>O que você quer comer?</Text>
        <TextInput
          style={styles.textArea}
          value={preferences}
          onChangeText={setPreferences}
          placeholder="Ex: algo leve com frango e legumes, rápido de fazer..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Restrictions */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Restrições / intolerâncias (opcional)</Text>
        <TextInput
          style={styles.input}
          value={restrictions}
          onChangeText={setRestrictions}
          placeholder="Ex: sem glúten, sem lactose..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Goal */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Objetivo</Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.chip, goal === g.key && styles.chipActive]}
              onPress={() => setGoal(g.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, goal === g.key && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meal type */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Tipo de refeição</Text>
        <View style={styles.chipRow}>
          {MEAL_TYPES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.chip, mealType === m.key && styles.chipActive]}
              onPress={() => setMealType(m.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, mealType === m.key && styles.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Servings */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Porções</Text>
        <View style={styles.servingsRow}>
          {[1, 2, 3, 4, 6].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.servingBtn, servings === n && styles.servingBtnActive]}
              onPress={() => setServings(n)}
            >
              <Text style={[styles.servingText, servings === n && styles.servingTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, mutation.isPending && styles.generateBtnDisabled]}
        onPress={() => { setResult(null); mutation.mutate(); }}
        disabled={mutation.isPending}
        activeOpacity={0.85}
      >
        {mutation.isPending ? (
          <><ActivityIndicator color={colors.accentPurple} size="small" /><Text style={styles.generateBtnText}>Gerando receita…</Text></>
        ) : (
          <><Zap size={18} color={colors.accentPurple} /><Text style={styles.generateBtnText}>Gerar receita</Text></>
        )}
      </TouchableOpacity>

      {/* Result */}
      {result && (
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => router.push({ pathname: '/recipe-detail', params: { data: JSON.stringify(result) } })}
          activeOpacity={0.85}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>{(result as { name?: string }).name ?? 'Receita gerada'}</Text>
            <ChevronRight size={18} color={colors.accentGreen} />
          </View>
          <Text style={styles.resultMeta}>
            {(result as { calories?: number }).calories ?? 0} kcal · {(result as { prep_time?: number }).prep_time ?? 0} min
          </Text>
          <Text style={styles.resultHint}>Toque para ver a receita completa</Text>
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={(e) => { e.stopPropagation(); setResult(null); mutation.mutate(); }}
            activeOpacity={0.8}
          >
            <RefreshCw size={13} color={colors.textSecondary} />
            <Text style={styles.regenerateText}>Gerar outra</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Tab: Cardápio Semanal ──────────────────────────────────────────────────────
const DAYS = [
  { key: 'segunda', label: 'Seg' },
  { key: 'terca', label: 'Ter' },
  { key: 'quarta', label: 'Qua' },
  { key: 'quinta', label: 'Qui' },
  { key: 'sexta', label: 'Sex' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
];

interface MealPlanMeal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  recipe_id?: number;
}

interface MealPlanDay {
  day: string;
  total_calories: number;
  meals: MealPlanMeal[];
}

interface WeeklyPlan {
  days: MealPlanDay[];
  generated_at: string;
}

function WeeklyPlanTab() {
  const [selectedDay, setSelectedDay] = useState('segunda');
  const router = useRouter();

  const { data: plan, isLoading, refetch } = useQuery<WeeklyPlan>({
    queryKey: ['weekly-plan'],
    queryFn: () => api.get('/meal-plan/weekly').then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/ai/generate-weekly').then((r) => r.data),
    onSuccess: () => refetch(),
    onError: () => Alert.alert('Erro', 'Não foi possível gerar o cardápio.'),
  });

  const currentDay = plan?.days.find((d) => d.day === selectedDay);

  const todayKey = (() => {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return days[new Date().getDay()];
  })();

  return (
    <View style={styles.tabContent}>
      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d.key}
            style={[styles.dayChip, selectedDay === d.key && styles.dayChipActive, d.key === todayKey && styles.dayChipToday]}
            onPress={() => setSelectedDay(d.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dayChipText, selectedDay === d.key && styles.dayChipTextActive]}>{d.label}</Text>
            {d.key === todayKey && <View style={styles.todayDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.accentGreen} style={styles.loader} />
      ) : !plan ? (
        /* No plan yet */
        <View style={styles.noPlan}>
          <Sparkles size={40} color={colors.accentPurple} />
          <Text style={styles.noPlanTitle}>Nenhum cardápio gerado</Text>
          <Text style={styles.noPlanText}>
            Gere um cardápio semanal personalizado com IA baseado no seu perfil e objetivos.
          </Text>
          <TouchableOpacity
            style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            activeOpacity={0.85}
          >
            {generateMutation.isPending ? (
              <><ActivityIndicator color={colors.accentPurple} size="small" /><Text style={styles.generateBtnText}>Gerando cardápio…</Text></>
            ) : (
              <><Zap size={18} color={colors.accentPurple} /><Text style={styles.generateBtnText}>Gerar cardápio com IA</Text></>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.planContent} showsVerticalScrollIndicator={false}>
          {/* Day total */}
          <View style={styles.dayTotalRow}>
            <Text style={styles.dayTotalLabel}>Total do dia</Text>
            <Text style={styles.dayTotalValue}>{currentDay?.total_calories ?? 0} kcal</Text>
          </View>

          {/* Meals */}
          <View style={styles.mealList}>
            {currentDay?.meals.length === 0 && (
              <Text style={styles.emptyText}>Nenhuma refeição para este dia.</Text>
            )}
            {(currentDay?.meals ?? []).map((meal, i) => (
              <TouchableOpacity
                key={i}
                style={styles.planMealCard}
                onPress={() => meal.recipe_id && router.push({ pathname: '/recipe-detail', params: { id: meal.recipe_id } })}
                activeOpacity={meal.recipe_id ? 0.8 : 1}
              >
                <View style={styles.planMealLeft}>
                  <Text style={styles.planMealType}>{meal.type}</Text>
                  <Text style={styles.planMealName}>{meal.name}</Text>
                  <View style={styles.planMealMacros}>
                    <Text style={[styles.planMacro, { color: colors.protein }]}>P {meal.protein}g</Text>
                    <Text style={[styles.planMacro, { color: colors.carbs }]}>C {meal.carbs}g</Text>
                    <Text style={[styles.planMacro, { color: colors.fats }]}>G {meal.fats}g</Text>
                  </View>
                </View>
                <View style={styles.planMealRight}>
                  <Text style={styles.planMealCal}>{meal.calories}</Text>
                  <Text style={styles.planMealCalUnit}>kcal</Text>
                  {meal.recipe_id && <ChevronRight size={14} color={colors.textMuted} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Regenerate */}
          <TouchableOpacity
            style={styles.regenWeekBtn}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            activeOpacity={0.8}
          >
            {generateMutation.isPending
              ? <ActivityIndicator color={colors.accentPurple} size="small" />
              : <><RefreshCw size={14} color={colors.accentPurple} /><Text style={styles.regenWeekText}>Regenerar cardápio</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'nutri', label: 'Nutricionista' },
  { key: 'ia', label: 'Gerador IA' },
  { key: 'cardapio', label: 'Cardápio' },
];

export default function ReceitasScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('nutri');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Receitas" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'nutri' && <NutriRecipes />}
      {activeTab === 'ia' && <AIGenerator />}
      {activeTab === 'cardapio' && <WeeklyPlanTab />}
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  pageTitle: { ...typography.h2, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm - 2, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.bgPrimary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabBtnTextActive: { color: colors.textPrimary },

  tabContent: { flex: 1 },

  // Nutri tab
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
  searchInput: { flex: 1, color: colors.textPrimary, paddingVertical: 11, fontSize: 14 },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  loader: { marginTop: spacing.xxl },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  emptySubtext: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },

  // AI tab
  aiContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiTitle: { ...typography.h3, color: colors.textPrimary },
  aiSubtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  field: { gap: 6 },
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accentPurple, borderColor: colors.accentPurple },
  chipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  servingsRow: { flexDirection: 'row', gap: 8 },
  servingBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingBtnActive: { backgroundColor: colors.accentPurple, borderColor: colors.accentPurple },
  servingText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  servingTextActive: { color: '#fff' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.accentPurple,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: colors.accentPurple },

  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentGreenDim,
    gap: 6,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  resultMeta: { ...typography.bodySmall, color: colors.textSecondary },
  resultHint: { ...typography.caption, color: colors.textMuted },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  regenerateText: { ...typography.bodySmall, color: colors.textSecondary },

  // Cardápio tab
  dayScroll: { flexGrow: 0 },
  dayScrollContent: { paddingHorizontal: spacing.md, gap: 8, paddingBottom: spacing.sm },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dayChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  dayChipToday: { borderColor: colors.accentGreenDim },
  dayChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  dayChipTextActive: { color: '#000' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentGreen },

  noPlan: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  noPlanTitle: { ...typography.h3, color: colors.textPrimary },
  noPlanText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  planContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  dayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTotalLabel: { ...typography.label, color: colors.textSecondary },
  dayTotalValue: { fontSize: 18, fontWeight: '700', color: colors.accentGreen },

  mealList: { gap: spacing.sm },
  planMealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  planMealLeft: { flex: 1, gap: 3 },
  planMealType: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  planMealName: { ...typography.label, color: colors.textPrimary, fontSize: 14 },
  planMealMacros: { flexDirection: 'row', gap: 8 },
  planMacro: { fontSize: 11, fontWeight: '600' },
  planMealRight: { alignItems: 'flex-end', gap: 2 },
  planMealCal: { fontSize: 18, fontWeight: '700', color: colors.accentGreen },
  planMealCalUnit: { ...typography.caption, color: colors.textMuted },

  regenWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  regenWeekText: { fontSize: 14, fontWeight: '600', color: colors.accentPurple },
});
