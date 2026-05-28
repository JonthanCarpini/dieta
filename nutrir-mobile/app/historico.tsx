import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, TrendingUp, Droplets, Scale } from 'lucide-react-native';
import api from '../src/api/client';
import LineChart from '../src/components/LineChart';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface HistoryEntry {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water_ml: number;
  weight?: number;
}

const PERIODS = [
  { key: '7', label: '7 dias' },
  { key: '14', label: '14 dias' },
  { key: '30', label: '30 dias' },
];

function StatCard({ title, value, unit, color, icon }: {
  title: string;
  value: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.statIcon}>{icon}</View>
      <View>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>
          {value} <Text style={styles.statUnit}>{unit}</Text>
        </Text>
      </View>
    </View>
  );
}

export default function HistoricoScreen() {
  const [period, setPeriod] = useState('7');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.md * 2;

  const { data, isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['history', period],
    queryFn: () => api.get('/user/diario/historico', { params: { days: period } }).then((r) => r.data),
  });

  const avgCalories = data?.length
    ? Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length)
    : 0;
  const avgWater = data?.length
    ? Math.round(data.reduce((s, d) => s + d.water_ml, 0) / data.length)
    : 0;
  const lastWeight = data?.findLast((d) => d.weight != null)?.weight;

  const calData = data?.map((d) => d.calories) ?? [];
  const protData = data?.map((d) => d.protein) ?? [];
  const waterData = data?.map((d) => d.water_ml / 1000) ?? [];
  const weightData = (data?.map((d) => d.weight).filter((w) => w != null) as number[]) ?? [];
  const labels = data?.map((d) => d.label) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Histórico</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary cards */}
          <View style={styles.statsRow}>
            <StatCard
              title="Média kcal"
              value={String(avgCalories)}
              unit="kcal/dia"
              color={colors.accentGreen}
              icon={<TrendingUp size={18} color={colors.accentGreen} />}
            />
            <StatCard
              title="Média água"
              value={(avgWater / 1000).toFixed(1)}
              unit="L/dia"
              color={colors.accentBlue}
              icon={<Droplets size={18} color={colors.accentBlue} />}
            />
            {lastWeight != null && (
              <StatCard
                title="Peso atual"
                value={String(lastWeight)}
                unit="kg"
                color={colors.accentPurple}
                icon={<Scale size={18} color={colors.accentPurple} />}
              />
            )}
          </View>

          {/* Calories chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Calorias por dia</Text>
            {calData.length >= 2 ? (
              <LineChart
                data={calData}
                labels={labels}
                width={chartWidth - spacing.md * 2}
                height={130}
                color={colors.accentGreen}
              />
            ) : (
              <Text style={styles.noData}>Dados insuficientes</Text>
            )}
          </View>

          {/* Protein chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Proteína (g)</Text>
            {protData.length >= 2 ? (
              <LineChart
                data={protData}
                labels={labels}
                width={chartWidth - spacing.md * 2}
                height={110}
                color={colors.protein}
              />
            ) : (
              <Text style={styles.noData}>Dados insuficientes</Text>
            )}
          </View>

          {/* Water chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Hidratação (L)</Text>
            {waterData.length >= 2 ? (
              <LineChart
                data={waterData}
                labels={labels}
                width={chartWidth - spacing.md * 2}
                height={110}
                color={colors.accentBlue}
              />
            ) : (
              <Text style={styles.noData}>Dados insuficientes</Text>
            )}
          </View>

          {/* Weight chart */}
          {weightData.length >= 2 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Peso (kg)</Text>
              <LineChart
                data={weightData}
                labels={labels.slice(-weightData.length)}
                width={chartWidth - spacing.md * 2}
                height={110}
                color={colors.accentPurple}
              />
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
  title: { ...typography.h3, color: colors.textPrimary },

  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  periodChip: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodChipActive: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  periodText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  periodTextActive: { color: '#000' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    minWidth: '45%',
  },
  statIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  statTitle: { ...typography.caption, color: colors.textMuted },
  statValue: { fontSize: 18, fontWeight: '700' },
  statUnit: { fontSize: 12, fontWeight: '400' },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chartTitle: { ...typography.label, color: colors.textPrimary },
  noData: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
