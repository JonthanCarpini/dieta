import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Droplets } from 'lucide-react-native';
import api from '../api/client';
import { colors, spacing, radius, typography } from '../constants/theme';

interface WaterData {
  consumed_ml: number;
  goal_ml: number;
}

const QUICK_ADD = [200, 300, 500];

export default function WaterTracker() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<WaterData>({
    queryKey: ['water-today'],
    queryFn: () => api.get('/water/today').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (ml: number) => api.post('/water/add', { ml }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water-today'] }),
  });

  const consumed = data?.consumed_ml ?? 0;
  const goal = data?.goal_ml ?? 2500;
  const pct = Math.min(consumed / goal, 1);
  const liters = (consumed / 1000).toFixed(1);
  const goalL = (goal / 1000).toFixed(1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Droplets size={16} color={colors.accentBlue} />
          <Text style={styles.title}>Hidratação</Text>
        </View>
        {isLoading && <ActivityIndicator color={colors.accentBlue} size="small" />}
      </View>

      {/* Bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
      </View>

      <View style={styles.stats}>
        <Text style={styles.consumed}>{liters}L</Text>
        <Text style={styles.goal}>meta: {goalL}L</Text>
      </View>

      {/* Quick add buttons */}
      <View style={styles.quickRow}>
        {QUICK_ADD.map((ml) => (
          <TouchableOpacity
            key={ml}
            style={[styles.quickBtn, mutation.isPending && styles.quickBtnDisabled]}
            onPress={() => mutation.mutate(ml)}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <Plus size={12} color={colors.accentBlue} />
            <Text style={styles.quickText}>{ml}ml</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.label, color: colors.textPrimary },

  barBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accentBlue,
    borderRadius: radius.full,
  },

  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  consumed: { fontSize: 16, fontWeight: '700', color: colors.accentBlue },
  goal: { ...typography.bodySmall, color: colors.textMuted },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnDisabled: { opacity: 0.5 },
  quickText: { fontSize: 12, fontWeight: '600', color: colors.accentBlue },
});
