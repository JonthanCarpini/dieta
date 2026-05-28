import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { History, ScanLine, Plus, Search, Menu } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useDrawerStore } from '../../src/store/drawerStore';
import api from '../../src/api/client';
import CalorieRing from '../../src/components/CalorieRing';
import WaterTracker from '../../src/components/WaterTracker';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

interface MacroData {
  consumed: number;
  goal: number;
}

interface DailySummary {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fats: MacroData;
  meals: Array<{
    id: number;
    name: string;
    time: string;
    calories: number;
    items: string[];
  }>;
}

function MacroCard({ label, consumed, goal, color }: { label: string; consumed: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroValueRow}>
        <Text style={[styles.macroValue, { color }]}>{consumed}</Text>
        <Text style={[styles.macroGoal, { color }]}>/{goal}g</Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroPct}>{pct}%</Text>
    </View>
  );
}

function MealCard({ meal, onAdd }: { meal: DailySummary['meals'][number]; onAdd: () => void }) {
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealTime}>{meal.time}</Text>
        </View>
        <View style={styles.mealRight}>
          <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
          <TouchableOpacity onPress={onAdd} style={styles.mealAddBtn} hitSlop={8}>
            <Plus size={14} color={colors.accentGreen} />
          </TouchableOpacity>
        </View>
      </View>
      {meal.items.length > 0 && (
        <Text style={styles.mealItems} numberOfLines={2}>
          {meal.items.join(' · ')}
        </Text>
      )}
    </View>
  );
}

export default function DiarioScreen() {
  const { user } = useAuthStore();
  const openDrawer = useDrawerStore((s) => s.open);
  const router = useRouter();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<DailySummary>({
    queryKey: ['daily-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [profileRes, mealsRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/meals'),
      ]);
      const profile = profileRes.data.profile;
      const allMeals: any[] = mealsRes.data ?? [];
      const todayMeals = allMeals.filter((m) => m.date?.startsWith(today));

      let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
      const meals = todayMeals.map((meal) => {
        const total = typeof meal.total === 'string' ? JSON.parse(meal.total) : (meal.total ?? {});
        const items: any[] = typeof meal.items === 'string' ? JSON.parse(meal.items) : (meal.items ?? []);
        totalCal  += Number(total.calories ?? 0);
        totalPro  += Number(total.protein  ?? 0);
        totalCarb += Number(total.carbs    ?? 0);
        totalFat  += Number(total.fat      ?? total.fats ?? 0);
        return {
          id: meal.id,
          name: meal.name,
          time: (meal.time ?? '').substring(0, 5),
          calories: Math.round(Number(total.calories ?? 0)),
          items: items.map((i) => i.name ?? String(i)).filter(Boolean),
        };
      });

      return {
        calories: { consumed: Math.round(totalCal),  goal: Number(profile?.target_calories ?? 2000) },
        protein:  { consumed: Math.round(totalPro),  goal: Number(profile?.target_protein  ?? 150)  },
        carbs:    { consumed: Math.round(totalCarb), goal: Number(profile?.target_carbs    ?? 250)  },
        fats:     { consumed: Math.round(totalFat),  goal: Number(profile?.target_fat      ?? 70)   },
        meals,
      } as DailySummary;
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accentGreen}
            colors={[colors.accentGreen]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openDrawer} style={styles.iconBtn} hitSlop={8}>
            <Menu size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/historico')}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <History size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accentGreen} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Não foi possível carregar os dados.</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Calorie Ring */}
            <View style={styles.ringSection}>
              <CalorieRing
                consumed={data?.calories.consumed ?? 0}
                goal={data?.calories.goal ?? 2000}
              />
            </View>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <MacroCard label="Proteína" consumed={data?.protein.consumed ?? 0} goal={data?.protein.goal ?? 150} color={colors.protein} />
              <MacroCard label="Carboidrato" consumed={data?.carbs.consumed ?? 0} goal={data?.carbs.goal ?? 250} color={colors.carbs} />
              <MacroCard label="Gordura" consumed={data?.fats.consumed ?? 0} goal={data?.fats.goal ?? 65} color={colors.fats} />
            </View>

            {/* Water tracker */}
            <WaterTracker />

            {/* Meals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Refeições de hoje</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity
                    onPress={() => router.push('/add-food')}
                    style={styles.searchBtn}
                    hitSlop={8}
                  >
                    <Search size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/scanner')}
                    style={styles.scanBtn}
                    activeOpacity={0.8}
                  >
                    <ScanLine size={16} color="#000" />
                    <Text style={styles.scanBtnText}>Scanner IA</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(!data?.meals || data.meals.length === 0) ? (
                <View style={styles.emptyMeals}>
                  <Text style={styles.emptyText}>Nenhuma refeição registrada hoje</Text>
                  <View style={styles.emptyActions}>
                    <TouchableOpacity onPress={() => router.push('/add-food')} style={styles.emptyBtn}>
                      <Search size={14} color={colors.accentGreen} />
                      <Text style={styles.emptyBtnText}>Buscar alimento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/scanner')} style={styles.emptyBtn}>
                      <ScanLine size={14} color={colors.accentGreen} />
                      <Text style={styles.emptyBtnText}>Escanear prato</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                data.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onAdd={() => router.push('/add-food')}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  headerCenter: { flex: 1 },
  greeting: { ...typography.bodySmall, color: colors.textSecondary },
  userName: { ...typography.h2, color: colors.textPrimary },
  iconBtn: { padding: spacing.sm },

  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  errorBox: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  errorText: { ...typography.body, color: colors.textSecondary },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.accentGreen, fontWeight: '600' },

  ringSection: { alignItems: 'center' },

  macrosRow: { flexDirection: 'row', gap: spacing.sm },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  macroLabel: { ...typography.caption, color: colors.textSecondary },
  macroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroGoal: { fontSize: 12, fontWeight: '600', opacity: 0.75 },
  macroBarBg: { height: 5, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: radius.full },
  macroPct: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },

  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchBtn: { padding: 6 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scanBtnText: { fontSize: 12, fontWeight: '700', color: '#000' },

  emptyMeals: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.md,
  },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptyActions: { flexDirection: 'row', gap: spacing.sm },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBtnText: { fontSize: 12, fontWeight: '600', color: colors.accentGreen },

  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mealName: { ...typography.label, color: colors.textPrimary, fontSize: 15 },
  mealTime: { ...typography.bodySmall, color: colors.textMuted },
  mealRight: { alignItems: 'flex-end', gap: 4 },
  mealCalories: { ...typography.bodySmall, color: colors.accentGreen, fontWeight: '600' },
  mealAddBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItems: { ...typography.bodySmall, color: colors.textMuted },
});
