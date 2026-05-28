import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { ChevronLeft, Play, Square, Clock } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

const FASTING_START_KEY = 'jejum_start_ts';
const FASTING_GOAL_HOURS = 16;
const FASTING_GOAL_MS = FASTING_GOAL_HOURS * 3600 * 1000;

const RING_SIZE = 220;
const RING_STROKE = 12;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

interface FastingSession {
  id: number;
  started_at: string;
  ended_at?: string;
  duration_hours: number;
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function JejumScreen() {
  const [startTs, setStartTs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  // Load persisted start timestamp
  useEffect(() => {
    SecureStore.getItemAsync(FASTING_START_KEY).then((val) => {
      if (val) {
        const ts = parseInt(val, 10);
        setStartTs(ts);
        setElapsed(Date.now() - ts);
      }
    });
  }, []);

  // Tick timer
  useEffect(() => {
    if (startTs === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTs);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTs]);

  const startMutation = useMutation({
    mutationFn: () => api.post('/jejum/start'),
    onSuccess: async () => {
      const now = Date.now();
      await SecureStore.setItemAsync(FASTING_START_KEY, String(now));
      setStartTs(now);
      setElapsed(0);
      qc.invalidateQueries({ queryKey: ['fasting-sessions'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível iniciar o jejum.'),
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post('/jejum/stop'),
    onSuccess: async () => {
      await SecureStore.deleteItemAsync(FASTING_START_KEY);
      setStartTs(null);
      setElapsed(0);
      qc.invalidateQueries({ queryKey: ['fasting-sessions'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível encerrar o jejum.'),
  });

  const handleStop = useCallback(() => {
    Alert.alert(
      'Encerrar jejum',
      `Você está há ${formatDuration(elapsed)} em jejum. Deseja encerrar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Encerrar', style: 'destructive', onPress: () => stopMutation.mutate() },
      ]
    );
  }, [elapsed, stopMutation]);

  const { data: sessions, isLoading } = useQuery<FastingSession[]>({
    queryKey: ['fasting-sessions'],
    queryFn: () => api.get('/jejum/history').then((r) => r.data),
  });

  const isActive = startTs !== null;
  const progress = Math.min(elapsed / FASTING_GOAL_MS, 1);
  const dashOffset = RING_CIRC * (1 - progress);
  const hoursElapsed = elapsed / 3600000;
  const pctLabel = Math.round(progress * 100);

  const ringColor = progress >= 1 ? colors.accentYellow : colors.accentGreen;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Jejum Intermitente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer ring */}
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
            <G rotation="-90" origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                stroke={colors.border} strokeWidth={RING_STROKE} fill="none"
              />
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                stroke={ringColor} strokeWidth={RING_STROKE} fill="none"
                strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                strokeDashoffset={isActive ? dashOffset : RING_CIRC}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          <View style={styles.ringCenter}>
            {isActive ? (
              <>
                <Text style={[styles.timerText, { color: ringColor }]}>{formatDuration(elapsed)}</Text>
                <Text style={styles.timerSub}>{pctLabel}% da meta {FASTING_GOAL_HOURS}h</Text>
                {hoursElapsed >= FASTING_GOAL_HOURS && (
                  <Text style={styles.goalReached}>🎯 Meta atingida!</Text>
                )}
              </>
            ) : (
              <>
                <Clock size={36} color={colors.textMuted} />
                <Text style={styles.idleText}>Nenhum jejum</Text>
                <Text style={styles.idleSubtext}>em andamento</Text>
              </>
            )}
          </View>
        </View>

        {/* Goal label */}
        <Text style={styles.goalLabel}>Meta: {FASTING_GOAL_HOURS}:00 horas</Text>

        {/* Action button */}
        {isActive ? (
          <TouchableOpacity
            style={[styles.stopBtn, stopMutation.isPending && styles.btnDisabled]}
            onPress={handleStop}
            disabled={stopMutation.isPending}
            activeOpacity={0.85}
          >
            {stopMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <><Square size={20} color="#fff" fill="#fff" /><Text style={styles.stopBtnText}>Encerrar jejum</Text></>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, startMutation.isPending && styles.btnDisabled]}
            onPress={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            activeOpacity={0.85}
          >
            {startMutation.isPending
              ? <ActivityIndicator color="#000" />
              : <><Play size={20} color="#000" fill="#000" /><Text style={styles.startBtnText}>Iniciar jejum</Text></>
            }
          </TouchableOpacity>
        )}

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico recente</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.accentGreen} />
          ) : !sessions || sessions.length === 0 ? (
            <Text style={styles.noHistory}>Nenhum jejum registrado</Text>
          ) : (
            <View style={styles.sessionList}>
              {sessions.slice(0, 10).map((s) => (
                <View key={s.id} style={styles.sessionCard}>
                  <View>
                    <Text style={styles.sessionDate}>
                      {new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </Text>
                    <Text style={styles.sessionTime}>
                      {new Date(s.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.sessionDuration}>
                    <Text style={[
                      styles.sessionHours,
                      { color: s.duration_hours >= FASTING_GOAL_HOURS ? colors.accentGreen : colors.textSecondary }
                    ]}>
                      {s.duration_hours.toFixed(1)}h
                    </Text>
                    {s.duration_hours >= FASTING_GOAL_HOURS && (
                      <Text style={styles.sessionBadge}>Meta</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.lg },

  ringWrapper: { alignItems: 'center', justifyContent: 'center', width: RING_SIZE, height: RING_SIZE },
  ringSvg: { position: 'absolute' },
  ringCenter: { alignItems: 'center', gap: 4 },
  timerText: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  timerSub: { ...typography.bodySmall, color: colors.textSecondary },
  goalReached: { fontSize: 13, fontWeight: '600', color: colors.accentYellow },
  idleText: { ...typography.h3, color: colors.textSecondary },
  idleSubtext: { ...typography.bodySmall, color: colors.textMuted },

  goalLabel: { ...typography.bodySmall, color: colors.textMuted },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.full,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentRed,
    borderRadius: radius.full,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  stopBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },

  section: { width: '100%', gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  noHistory: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },

  sessionList: { gap: spacing.sm },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionDate: { ...typography.label, color: colors.textPrimary },
  sessionTime: { ...typography.caption, color: colors.textMuted },
  sessionDuration: { alignItems: 'flex-end', gap: 2 },
  sessionHours: { fontSize: 18, fontWeight: '700' },
  sessionBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentGreen,
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
