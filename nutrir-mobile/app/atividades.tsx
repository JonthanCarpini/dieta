import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Flame, Clock, Award, Activity, Play, Pause } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';
import { useStepCounter } from '../src/hooks/useStepCounter';
import { useStepTrackerStore } from '../src/store/stepTrackerStore';

// Configurações do Anel de Progresso
const RING_SIZE = 180;
const RING_STROKE = 10;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

// Tabela de METs
const EXERCISE_METS: Record<string, number> = {
  'Caminhada': 3.5,
  'Corrida': 8.0,
  'Musculação': 5.0,
  'Ciclismo': 6.0,
  'Natação': 7.0,
  'Ioga': 2.5,
  'Pilates': 3.0,
  'Dança': 4.5,
  'Outro': 4.0,
};

interface Exercise {
  name: string;
  duration_min: number;
  calories: number;
  time: string;
}

interface ActivityData {
  steps: number;
  steps_target: number;
  steps_calories: number;
  exercises: Exercise[];
  date: string;
}

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AtividadesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = getLocalDateString();

  // Estados dos Modais e Inputs
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [manualSteps, setManualSteps] = useState('');
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  
  // Estados do Formulário de Exercício
  const [exName, setExName] = useState('Caminhada');
  const [exDuration, setExDuration] = useState('');
  const [exCustomCal, setExCustomCal] = useState('');

  // Busca do histórico de atividades de hoje do backend
  const { data: activity, isLoading, refetch } = useQuery<ActivityData>({
    queryKey: ['activity-today'],
    queryFn: () => api.get(`/user/activity?date=${today}`).then((r) => r.data),
  });

  const { isTracking, setTracking } = useStepTrackerStore();

  // Hook do Pedometer Nativo
  const { steps: sensorSteps, isPedometerAvailable, permissionStatus, error: sensorError, refetchSteps, onSaveSuccess } = useStepCounter(activity?.steps ?? 0);

  // Busca do perfil do usuário para obter o peso
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/profile').then((r) => r.data),
  });
  const weight = profileData?.profile?.weight ? Number(profileData.profile.weight) : 70;

  // Mutação para atualizar passos no backend
  const saveStepsMutation = useMutation({
    mutationFn: (newSteps: number) =>
      api.post('/user/activity/steps', {
        date: today,
        steps: newSteps,
        steps_target: activity?.steps_target ?? 10000,
      }),
    onSuccess: (data, variables) => {
      refetch();
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      onSaveSuccess(variables);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível salvar os passos.'),
  });

  // Sincroniza passos do sensor com o backend se o pedômetro estiver funcionando
  useEffect(() => {
    if (isPedometerAvailable && permissionStatus === 'granted' && sensorSteps > 0) {
      // Evita chamadas repetidas se o valor já for o mesmo
      if (sensorSteps !== activity?.steps) {
        saveStepsMutation.mutate(sensorSteps);
      }
    }
  }, [sensorSteps, isPedometerAvailable, permissionStatus]);

  // Mutação para adicionar exercício
  const addExerciseMutation = useMutation({
    mutationFn: (variables: { name: string; duration_min: number; custom_calories?: number; met: number }) =>
      api.post('/user/activity/exercise', {
        date: today,
        name: variables.name,
        duration_min: variables.duration_min,
        custom_calories: variables.custom_calories,
        met: variables.met,
      }),
    onSuccess: () => {
      refetch();
      setExerciseModalVisible(false);
      setExDuration('');
      setExCustomCal('');
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível adicionar o exercício.'),
  });

  // Mutação para excluir exercício
  const deleteExerciseMutation = useMutation({
    mutationFn: (index: number) => api.delete(`/user/activity/exercise/${index}?date=${today}`),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível remover o exercício.'),
  });

  const handleSaveManualSteps = () => {
    const s = parseInt(manualSteps, 10);
    if (isNaN(s) || s < 0) {
      Alert.alert('Valor inválido', 'Digite uma quantidade de passos válida.');
      return;
    }
    saveStepsMutation.mutate(s);
    setStepsModalVisible(false);
    setManualSteps('');
  };

  const handleAddExercise = () => {
    const duration = parseInt(exDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Valor inválido', 'Digite uma duração em minutos válida.');
      return;
    }

    const met = EXERCISE_METS[exName] || 4.0;
    const customCal = exCustomCal !== '' ? parseInt(exCustomCal, 10) : undefined;

    addExerciseMutation.mutate({
      name: exName,
      duration_min: duration,
      custom_calories: customCal,
      met,
    });
  };

  // Cálculos gerais
  const stepsCount = activity?.steps ?? 0;
  const stepsTarget = activity?.steps_target ?? 10000;
  const stepsCalories = Number(activity?.steps_calories ?? 0);
  const exercises = activity?.exercises ?? [];

  const exercisesCalories = exercises.reduce((acc, curr) => acc + Number(curr.calories), 0);
  const totalBurned = Math.round(stepsCalories + exercisesCalories);

  // SVG calculations
  const progress = Math.min(stepsCount / stepsTarget, 1);
  const dashOffset = RING_CIRC * (1 - progress);
  const pctLabel = Math.round(progress * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Atividades Físicas</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accentGreen} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Card de Passos do Dia */}
          <View style={styles.card}>
            <View style={styles.ringWrapper}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <G rotation="-90" origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}>
                  <Circle
                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                    stroke={colors.border} strokeWidth={RING_STROKE} fill="none"
                  />
                  <Circle
                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                    stroke={colors.accentGreen} strokeWidth={RING_STROKE} fill="none"
                    strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </G>
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.stepsCount}>{stepsCount.toLocaleString('pt-BR')}</Text>
                <Text style={styles.stepsLabel}>de {stepsTarget.toLocaleString('pt-BR')} passos</Text>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>{pctLabel}% concluído</Text>
                </View>
              </View>
            </View>

            {isPedometerAvailable && (
              <TouchableOpacity 
                style={[styles.trackingToggleBtn, isTracking ? styles.trackingBtnActive : styles.trackingBtnInactive]} 
                onPress={() => setTracking(!isTracking)}
                activeOpacity={0.85}
              >
                {isTracking ? (
                  <>
                    <Pause size={18} color="#EF4444" />
                    <Text style={styles.trackingBtnTextActive}>Pausar Contagem</Text>
                  </>
                ) : (
                  <>
                    <Play size={18} color="#000" />
                    <Text style={styles.trackingBtnTextInactive}>Iniciar Contagem</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Ações de Passos */}
            <View style={styles.stepsActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => {
                setManualSteps(String(stepsCount));
                setStepsModalVisible(true);
              }}>
                <Text style={styles.actionBtnText}>Ajustar Passos</Text>
              </TouchableOpacity>
              {isPedometerAvailable && (
                <TouchableOpacity style={[styles.actionButton, styles.syncBtn]} onPress={() => {
                  if (Platform.OS === 'android') {
                    Alert.alert('Sincronização de Passos', 'No Android, os passos são monitorados e sincronizados em tempo real conforme você caminha com o aplicativo aberto.');
                  }
                  refetchSteps();
                }}>
                  <Text style={styles.syncBtnText}>Sincronizar Sensor</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isPedometerAvailable && (
              <Text style={styles.warningText}>
                ⚠️ Sensor nativo indisponível. Passos inseridos manualmente.
              </Text>
            )}

            {sensorError && (
              <Text style={styles.warningText}>
                ⚠️ {sensorError}
              </Text>
            )}
          </View>

          {/* Resumo de Calorias Queimadas */}
          <View style={styles.burnedRow}>
            <View style={styles.burnedCard}>
              <Flame size={20} color={colors.accentOrange} />
              <View>
                <Text style={styles.burnedValue}>{Math.round(stepsCalories)} kcal</Text>
                <Text style={styles.burnedLabel}>Gasto dos passos</Text>
              </View>
            </View>

            <View style={styles.burnedCard}>
              <Activity size={20} color={colors.accentPurple} />
              <View>
                <Text style={styles.burnedValue}>{Math.round(exercisesCalories)} kcal</Text>
                <Text style={styles.burnedLabel}>Gasto dos exercícios</Text>
              </View>
            </View>
          </View>

          <View style={[styles.burnedCard, styles.totalBurnedCard]}>
            <Award size={24} color={colors.accentYellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.totalBurnedVal}>{totalBurned} kcal queimadas</Text>
              <Text style={styles.totalBurnedLabel}>Gasto total acumulado de hoje</Text>
            </View>
          </View>

          {/* Seção de Exercícios */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Outras Atividades</Text>
              <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setExerciseModalVisible(true)}>
                <Plus size={16} color="#000" />
                <Text style={styles.addExerciseBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Nenhuma atividade extra registrada hoje</Text>
              </View>
            ) : (
              exercises.map((item, idx) => (
                <View key={idx} style={styles.exerciseItem}>
                  <View style={styles.exInfo}>
                    <Text style={styles.exName}>{item.name}</Text>
                    <View style={styles.exSubRow}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={styles.exSubText}>{item.duration_min} min</Text>
                      <Text style={styles.exDot}>·</Text>
                      <Text style={styles.exSubText}>{item.time}</Text>
                    </View>
                  </View>
                  <View style={styles.exRight}>
                    <Text style={styles.exCalories}>-{item.calories} kcal</Text>
                    <TouchableOpacity
                      onPress={() => deleteExerciseMutation.mutate(idx)}
                      style={styles.exDeleteBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal - Ajustar Passos Manuais */}
      <Modal animationType="fade" transparent={true} visible={stepsModalVisible} onRequestClose={() => setStepsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajustar Passos</Text>
            <Text style={styles.modalLabel}>Informe a quantidade de passos de hoje:</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={manualSteps}
              onChangeText={setManualSteps}
              placeholder="Ex: 5000"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setStepsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveManualSteps}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal - Adicionar Exercício */}
      <Modal animationType="slide" transparent={true} visible={exerciseModalVisible} onRequestClose={() => setExerciseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Adicionar Atividade</Text>
            
            <Text style={styles.modalLabel}>Tipo de Exercício</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesList}>
              {Object.keys(EXERCISE_METS).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBadge, exName === type && styles.typeBadgeActive]}
                  onPress={() => setExName(type)}
                >
                  <Text style={[styles.typeBadgeText, exName === type && styles.typeBadgeTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Duração (minutos)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={exDuration}
              onChangeText={setExDuration}
              placeholder="Ex: 45"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Calorias Gastas (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={exCustomCal}
              onChangeText={setExCustomCal}
              placeholder={`Vazio = calcular via MET (~${exDuration ? Math.round((EXERCISE_METS[exName] || 4) * weight * (Number(exDuration) / 60)) : 0} kcal)`}
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setExerciseModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddExercise}>
                <Text style={styles.saveBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  title: { ...typography.h3, color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Card de passos
  card: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsCount: { ...typography.h1, color: colors.textPrimary, fontSize: 28 },
  stepsLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  pctBadge: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  pctText: { fontSize: 10, fontWeight: '700', color: colors.accentGreen },
  stepsActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionBtnText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  syncBtn: { borderColor: colors.accentGreen, backgroundColor: 'rgba(74,222,128,0.05)' },
  syncBtnText: { ...typography.bodySmall, color: colors.accentGreen, fontWeight: '600' },
  warningText: { ...typography.caption, color: colors.accentYellow, textAlign: 'center', marginTop: 4 },

  // Burned calories
  burnedRow: { flexDirection: 'row', gap: spacing.md },
  burnedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  burnedValue: { ...typography.label, color: colors.textPrimary, fontSize: 15 },
  burnedLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: 1 },

  totalBurnedCard: {
    borderColor: 'rgba(245,158,11,0.25)',
    backgroundColor: 'rgba(245,158,11,0.04)',
    gap: spacing.md,
  },
  totalBurnedVal: { ...typography.label, color: colors.accentYellow, fontSize: 16 },
  totalBurnedLabel: { ...typography.caption, color: colors.textSecondary },

  // Exercícios
  section: { gap: spacing.sm, marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addExerciseBtnText: { fontSize: 11, fontWeight: '700', color: '#000' },
  emptyCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  exInfo: { flex: 1, gap: 4 },
  exName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  exSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exSubText: { ...typography.caption, color: colors.textMuted },
  exDot: { color: colors.textMuted, fontSize: 10 },
  exRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exCalories: { ...typography.body, color: colors.accentRed, fontWeight: '700' },
  exDeleteBtn: { padding: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  modalLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    ...typography.body,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  modalBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelBtnText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.accentGreen },
  saveBtnText: { ...typography.body, color: '#000', fontWeight: '700' },

  // Formulario Exercício específico
  typesList: { flexDirection: 'row', marginVertical: 4 },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: spacing.xs,
  },
  typeBadgeActive: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: colors.accentGreen,
  },
  typeBadgeText: { ...typography.caption, color: colors.textSecondary },
  typeBadgeTextActive: { color: colors.accentGreen, fontWeight: '700' },

  // Tracking button styles
  trackingToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  trackingBtnInactive: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  trackingBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#EF4444',
  },
  trackingBtnTextInactive: {
    ...typography.body,
    fontWeight: '700',
    color: '#000',
  },
  trackingBtnTextActive: {
    ...typography.body,
    fontWeight: '700',
    color: '#EF4444',
  },
});
