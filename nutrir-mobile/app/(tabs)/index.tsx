import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { History, ScanLine, Plus, Search, Menu, X, AlertTriangle, Trash2, Edit3, Award } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useDrawerStore } from '../../src/store/drawerStore';
import api from '../../src/api/client';
import CalorieRing from '../../src/components/CalorieRing';
import WaterTracker from '../../src/components/WaterTracker';
import { colors, spacing, radius, typography } from '../../src/constants/theme';
import { useState } from 'react';

interface MacroData {
  consumed: number;
  goal: number;
}

interface MealItemDetail {
  name: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailySummary {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fats: MacroData;
  meals: Array<{
    id: string;
    date: string;
    name: string;
    time: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    items: MealItemDetail[];
  }>;
  activity: {
    steps: number;
    steps_target: number;
    steps_calories: number;
    exercises: Array<{
      name: string;
      duration_min: number;
      calories: number;
      time: string;
    }>;
  };
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

function MealCard({ meal, onAdd, onPress }: { meal: DailySummary['meals'][number]; onAdd: () => void; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.mealCard} onPress={onPress} activeOpacity={0.85}>
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
          {meal.items.map((i) => i.name).join(' · ')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DiarioScreen() {
  const { user } = useAuthStore();
  const openDrawer = useDrawerStore((s) => s.open);
  const router = useRouter();

  // Estados do Modal Detalhado
  const [selectedMealDetail, setSelectedMealDetail] = useState<DailySummary['meals'][number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados do Sub-modal de Edição de Alimento de Refeição
  const [editFoodModalVisible, setEditFoodModalVisible] = useState(false);
  const [editingFoodIndex, setEditingFoodIndex] = useState<number | null>(null);
  const [editFoodName, setEditFoodName] = useState('');
  const [editFoodQty, setEditFoodQty] = useState('');
  const [editFoodCalories, setEditFoodCalories] = useState('');
  const [editFoodProtein, setEditFoodProtein] = useState('');
  const [editFoodCarbs, setEditFoodCarbs] = useState('');
  const [editFoodFats, setEditFoodFats] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<DailySummary>({
    queryKey: ['daily-summary'],
    queryFn: async () => {
      const today = getLocalDateString();
      const [profileRes, mealsRes, activityRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/meals'),
        api.get(`/user/activity?date=${today}`).catch(() => ({
          data: { steps: 0, steps_target: 10000, steps_calories: 0.0, exercises: [] }
        }))
      ]);
      const profile = profileRes.data.profile;
      const allMeals: any[] = mealsRes.data ?? [];
      const todayMeals = allMeals.filter((m) => m.date?.startsWith(today));
      const activityData = activityRes.data ?? { steps: 0, steps_target: 10000, steps_calories: 0.0, exercises: [] };

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
          date: meal.date?.split('T')[0] || today,
          name: meal.name,
          time: (meal.time ?? '').substring(0, 5),
          calories: Math.round(Number(total.calories ?? 0)),
          protein: Math.round(Number(total.protein ?? 0)),
          carbs: Math.round(Number(total.carbs ?? 0)),
          fats: Math.round(Number(total.fat ?? total.fats ?? 0)),
          items: items.map((i) => ({
            name: i.name ?? String(i),
            qty: Number(i.qty || i.quantity || 100),
            calories: Math.round(Number(i.calories ?? 0)),
            protein: Math.round(Number(i.protein ?? 0)),
            carbs: Math.round(Number(i.carbs ?? 0)),
            fat: Math.round(Number(i.fat ?? i.fats ?? 0)),
          })),
        };
      });

      return {
        calories: { consumed: Math.round(totalCal),  goal: Number(profile?.target_calories ?? 2000) },
        protein:  { consumed: Math.round(totalPro),  goal: Number(profile?.target_protein  ?? 150)  },
        carbs:    { consumed: Math.round(totalCarb), goal: Number(profile?.target_carbs    ?? 250)  },
        fats:     { consumed: Math.round(totalFat),  goal: Number(profile?.target_fat      ?? 70)   },
        meals,
        activity: activityData,
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

  const consumedCal = data?.calories.consumed ?? 0;
  const goalCal = data?.calories.goal ?? 2000;

  const stepsCount = data?.activity?.steps ?? 0;
  const stepsCalories = Number(data?.activity?.steps_calories ?? 0);
  const exercises = data?.activity?.exercises ?? [];
  const exercisesCalories = exercises.reduce((acc, curr) => acc + Number(curr.calories), 0);
  const totalBurned = Math.round(stepsCalories + exercisesCalories);
  
  const netConsumedCal = Math.max(0, Math.round(consumedCal - totalBurned));
  const calPct = goalCal > 0 ? netConsumedCal / goalCal : 0;

  // Lógica de Exclusão de Refeição Inteira
  const handleDeleteMeal = (mealId: string) => {
    Alert.alert(
      'Excluir refeição',
      'Tem certeza de que deseja excluir esta refeição inteira?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/user/meals/${mealId}`);
              setModalVisible(false);
              setSelectedMealDetail(null);
              refetch();
            } catch (err) {
              console.error('Erro ao excluir refeição:', err);
              Alert.alert('Erro', 'Não foi possível excluir a refeição.');
            }
          }
        }
      ]
    );
  };

  // Lógica Centralizada de Atualização da Refeição
  const updateMealInBackend = async (updatedItems: MealItemDetail[]) => {
    if (!selectedMealDetail) return;
    try {
      const total = {
        calories: Math.round(updatedItems.reduce((sum, item) => sum + item.calories, 0)),
        protein: Math.round(updatedItems.reduce((sum, item) => sum + item.protein, 0)),
        carbs: Math.round(updatedItems.reduce((sum, item) => sum + item.carbs, 0)),
        fat: Math.round(updatedItems.reduce((sum, item) => sum + item.fat, 0)),
      };

      const dbItems = updatedItems.map(i => ({
        name: i.name,
        qty: i.qty,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat
      }));

      await api.post('/user/meals', {
        id: selectedMealDetail.id,
        date: selectedMealDetail.date,
        time: selectedMealDetail.time,
        name: selectedMealDetail.name,
        items: dbItems,
        total,
      });

      const updatedMeal = {
        ...selectedMealDetail,
        calories: total.calories,
        protein: total.protein,
        carbs: total.carbs,
        fats: total.fat,
        items: updatedItems,
      };
      setSelectedMealDetail(updatedMeal);
      refetch();
    } catch (err) {
      console.error('Erro ao salvar alteração da refeição:', err);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  // Exclusão de Alimento Individual
  const handleDeleteMealFood = (foodName: string) => {
    if (!selectedMealDetail) return;
    Alert.alert(
      'Excluir alimento',
      `Deseja remover "${foodName}" desta refeição?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = selectedMealDetail.items.filter((item) => item.name !== foodName);
            if (updatedItems.length === 0) {
              await api.delete(`/user/meals/${selectedMealDetail.id}`);
              setModalVisible(false);
              setSelectedMealDetail(null);
              refetch();
            } else {
              await updateMealInBackend(updatedItems);
            }
          }
        }
      ]
    );
  };

  // Abertura do Sub-modal de Edição
  const handleEditMealFoodPress = (index: number) => {
    if (!selectedMealDetail) return;
    const f = selectedMealDetail.items[index];
    setEditingFoodIndex(index);
    setEditFoodName(f.name);
    setEditFoodQty(String(f.qty));
    setEditFoodCalories(String(f.calories));
    setEditFoodProtein(String(f.protein));
    setEditFoodCarbs(String(f.carbs));
    setEditFoodFats(String(f.fat));
    setEditFoodModalVisible(true);
  };

  const adjustMealFoodQuantity = (amount: number) => {
    const currentQty = Number(editFoodQty) || 100;
    const nextQty = Math.max(10, currentQty + amount);
    const ratio = nextQty / currentQty;

    setEditFoodQty(String(nextQty));
    setEditFoodCalories(String(Math.round((Number(editFoodCalories) || 0) * ratio)));
    setEditFoodProtein(String(Math.round((Number(editFoodProtein) || 0) * ratio)));
    setEditFoodCarbs(String(Math.round((Number(editFoodCarbs) || 0) * ratio)));
    setEditFoodFats(String(Math.round((Number(editFoodFats) || 0) * ratio)));
  };

  const saveMealFoodEdit = async () => {
    if (editingFoodIndex === null || !selectedMealDetail) return;
    
    const qty = Number(editFoodQty) || 100;
    const calories = Number(editFoodCalories) || 0;
    const protein = Number(editFoodProtein) || 0;
    const carbs = Number(editFoodCarbs) || 0;
    const fat = Number(editFoodFats) || 0;
    
    const updatedItems = [...selectedMealDetail.items];
    updatedItems[editingFoodIndex] = {
      name: editFoodName,
      qty,
      calories,
      protein,
      carbs,
      fat
    };

    await updateMealInBackend(updatedItems);
    setEditFoodModalVisible(false);
    setEditingFoodIndex(null);
  };

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

        {/* Banner de Notificação de Limite de Calorias */}
        {calPct >= 1.0 ? (
          <View style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.alertBannerText, { color: '#EF4444' }]}>
              Atenção! Você ultrapassou 100% da sua meta diária de calorias de hoje.
            </Text>
          </View>
        ) : calPct >= 0.8 ? (
          <View style={[styles.alertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={[styles.alertBannerText, { color: '#F59E0B' }]}>
              Aviso: Você consumiu mais de 80% da sua meta diária de calorias de hoje.
            </Text>
          </View>
        ) : null}

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
                consumed={consumedCal}
                goal={data?.calories.goal ?? 2000}
              />
              <View style={styles.netCalRow}>
                <View style={styles.netCalItem}>
                  <Text style={styles.netCalVal}>{consumedCal}</Text>
                  <Text style={styles.netCalLabel}>Consumido</Text>
                </View>
                <View style={[styles.netCalItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
                  <Text style={[styles.netCalVal, { color: colors.accentOrange }]}>{totalBurned}</Text>
                  <Text style={styles.netCalLabel}>Gasto</Text>
                </View>
                <View style={styles.netCalItem}>
                  <Text style={styles.netCalVal}>
                    {Math.max(0, goalCal - netConsumedCal)}
                  </Text>
                  <Text style={styles.netCalLabel}>Restante</Text>
                </View>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <MacroCard label="Proteína" consumed={data?.protein.consumed ?? 0} goal={data?.protein.goal ?? 150} color={colors.protein} />
              <MacroCard label="Carboidrato" consumed={data?.carbs.consumed ?? 0} goal={data?.carbs.goal ?? 250} color={colors.carbs} />
              <MacroCard label="Gordura" consumed={data?.fats.consumed ?? 0} goal={data?.fats.goal ?? 65} color={colors.fats} />
            </View>

            {/* Water tracker */}
            <WaterTracker />

            {/* Card de Atividade Física (Passos + Exercícios) */}
            <TouchableOpacity
              style={styles.activityCardHome}
              onPress={() => router.push('/atividades')}
              activeOpacity={0.85}
            >
              <View style={styles.actCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Award size={18} color={colors.accentGreen} />
                  <Text style={styles.actCardTitle}>Atividade de Hoje</Text>
                </View>
                <Text style={styles.actCardLink}>Ver mais &gt;</Text>
              </View>
              <View style={styles.actCardBody}>
                <View style={styles.actCol}>
                  <Text style={styles.actVal}>{stepsCount.toLocaleString('pt-BR')}</Text>
                  <Text style={styles.actLabel}>Passos</Text>
                </View>
                <View style={[styles.actCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }]}>
                  <Text style={styles.actVal}>{totalBurned} kcal</Text>
                  <Text style={styles.actLabel}>Gasto Total</Text>
                </View>
                <View style={styles.actCol}>
                  <Text style={styles.actVal}>{exercises.length}</Text>
                  <Text style={styles.actLabel}>Atividades</Text>
                </View>
              </View>
            </TouchableOpacity>

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
                    onPress={() => {
                      setSelectedMealDetail(meal);
                      setModalVisible(true);
                    }}
                  />
                ))
              )}

              {/* Modal Detalhado de Refeição */}
              <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    {/* Header com Excluir Refeição e Fechar */}
                    <View style={styles.modalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalTitle}>{selectedMealDetail?.name}</Text>
                        <Text style={styles.modalSubTitle}>{selectedMealDetail?.time}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                        {selectedMealDetail && (
                          <TouchableOpacity
                            onPress={() => handleDeleteMeal(selectedMealDetail.id)}
                            style={[styles.modalCloseBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                            activeOpacity={0.7}
                            hitSlop={8}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setModalVisible(false)}
                          style={styles.modalCloseBtn}
                          activeOpacity={0.8}
                          hitSlop={8}
                        >
                          <X size={16} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Resumo de Macros */}
                    <View style={styles.modalMacrosRow}>
                      <View style={[styles.modalMacroBadge, { borderLeftColor: colors.accentGreen }]}>
                        <Text style={styles.modalMacroVal}>{selectedMealDetail?.calories} kcal</Text>
                        <Text style={styles.modalMacroLabel}>Calorias</Text>
                      </View>
                      <View style={[styles.modalMacroBadge, { borderLeftColor: colors.protein }]}>
                        <Text style={styles.modalMacroVal}>{selectedMealDetail?.protein}g</Text>
                        <Text style={styles.modalMacroLabel}>Proteína</Text>
                      </View>
                      <View style={[styles.modalMacroBadge, { borderLeftColor: colors.carbs }]}>
                        <Text style={styles.modalMacroVal}>{selectedMealDetail?.carbs}g</Text>
                        <Text style={styles.modalMacroLabel}>Carbo</Text>
                      </View>
                      <View style={[styles.modalMacroBadge, { borderLeftColor: colors.fats }]}>
                        <Text style={styles.modalMacroVal}>{selectedMealDetail?.fats}g</Text>
                        <Text style={styles.modalMacroLabel}>Gordura</Text>
                      </View>
                    </View>

                    {/* Lista de Alimentos com Ações de Edição e Exclusão */}
                    <Text style={styles.modalSectionTitle}>Alimentos</Text>
                    <ScrollView style={styles.modalFoodList} contentContainerStyle={{ gap: spacing.sm }}>
                      {selectedMealDetail?.items.map((item, idx) => (
                        <View key={idx} style={styles.modalFoodItem}>
                          <View style={styles.modalFoodInfo}>
                            <Text style={styles.modalFoodName}>{item.name}</Text>
                            <Text style={styles.modalFoodQty}>{item.qty}g</Text>
                            <View style={styles.modalFoodMacros}>
                              <Text style={[styles.modalFoodMacroText, { color: colors.protein }]}>P:{item.protein}g</Text>
                              <Text style={[styles.modalFoodMacroText, { color: colors.carbs }]}>C:{item.carbs}g</Text>
                              <Text style={[styles.modalFoodMacroText, { color: colors.fats }]}>G:{item.fat}g</Text>
                            </View>
                          </View>
                          <View style={styles.modalFoodRightActions}>
                            <Text style={styles.modalFoodCal}>{item.calories} kcal</Text>
                            <View style={styles.foodActionButtons}>
                              <TouchableOpacity
                                style={styles.foodItemActionBtn}
                                onPress={() => handleEditMealFoodPress(idx)}
                                activeOpacity={0.7}
                              >
                                <Edit3 size={12} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.foodItemActionBtn, { borderColor: 'rgba(239,68,68,0.2)' }]}
                                onPress={() => handleDeleteMealFood(item.name)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={12} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {/* Sub-modal de Edição de Alimento no Diário */}
              <Modal
                animationType="slide"
                transparent={true}
                visible={editFoodModalVisible}
                onRequestClose={() => setEditFoodModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { maxHeight: 'none' }]}>
                    <Text style={styles.subModalTitle}>Editar Alimento</Text>

                    {/* Nome */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nome</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFoodName}
                        onChangeText={setEditFoodName}
                        placeholder="Nome do alimento"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    {/* Quantidade */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Quantidade (g)</Text>
                      <View style={styles.quantityEditRow}>
                        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustMealFoodQuantity(-50)}>
                          <Text style={styles.adjBtnText}>-50g</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustMealFoodQuantity(-10)}>
                          <Text style={styles.adjBtnText}>-10</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.textInput, { flex: 1, textAlign: 'center', marginHorizontal: 6 }]}
                          value={editFoodQty}
                          onChangeText={setEditFoodQty}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustMealFoodQuantity(10)}>
                          <Text style={styles.adjBtnText}>+10</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.adjBtn} onPress={() => adjustMealFoodQuantity(50)}>
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
                          value={editFoodCalories}
                          onChangeText={setEditFoodCalories}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Proteína (g)</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editFoodProtein}
                          onChangeText={setEditFoodProtein}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Carbo (g)</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editFoodCarbs}
                          onChangeText={setEditFoodCarbs}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Gordura (g)</Text>
                        <TextInput
                          style={styles.textInput}
                          value={editFoodFats}
                          onChangeText={setEditFoodFats}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.cancelBtn]}
                        onPress={() => setEditFoodModalVisible(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.saveBtn]}
                        onPress={saveMealFoodEdit}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.saveBtnText}>Salvar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

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

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

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

  // Estilos do Modal Detalhado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalMacrosRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modalMacroBadge: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 3,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
  },
  modalMacroVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalMacroLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalFoodList: {
    flexGrow: 0,
  },
  modalFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalFoodInfo: {
    flex: 1,
    gap: 2,
  },
  modalFoodName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalFoodQty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalFoodRightActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  modalFoodCal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentGreen,
  },
  modalFoodMacros: {
    flexDirection: 'row',
    gap: 6,
  },
  modalFoodMacroText: {
    fontSize: 10,
    fontWeight: '600',
  },
  foodActionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  foodItemActionBtn: {
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Sub-modal de Edição
  subModalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 4,
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
    marginTop: spacing.md,
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

  // Estilos de Atividade e Calorias Líquidas no Dashboard
  netCalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  netCalItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netCalVal: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 15,
  },
  netCalLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  activityCardHome: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  actCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actCardTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 14,
  },
  actCardLink: {
    ...typography.caption,
    color: colors.accentGreen,
    fontWeight: '600',
  },
  actCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  actCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actVal: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 18,
  },
  actLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
