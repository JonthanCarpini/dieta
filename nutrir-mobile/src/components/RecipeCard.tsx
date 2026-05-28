import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Users, ChefHat, Zap } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../constants/theme';

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prep_time: number;
  servings: number;
  difficulty: 'fácil' | 'médio' | 'difícil';
  category?: string;
  tags?: string[];
  source?: 'nutricionista' | 'ia' | 'usuario';
}

const DIFFICULTY_COLOR: Record<string, string> = {
  fácil: colors.accentGreen,
  médio: colors.accentYellow,
  difícil: colors.accentRed,
};

interface Props {
  recipe: Recipe;
  onPress: () => void;
  compact?: boolean;
}

export default function RecipeCard({ recipe, onPress, compact = false }: Props) {
  const diffColor = DIFFICULTY_COLOR[recipe.difficulty] ?? colors.textSecondary;

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress} activeOpacity={0.8}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <ChefHat size={20} color={colors.accentGreen} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={2}>{recipe.name}</Text>
          {recipe.description && !compact && (
            <Text style={styles.description} numberOfLines={1}>{recipe.description}</Text>
          )}
        </View>
        <Text style={styles.calories}>{recipe.calories} kcal</Text>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{recipe.prep_time} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{recipe.servings} porções</Text>
        </View>
        <View style={[styles.badge, { borderColor: diffColor }]}>
          <Text style={[styles.badgeText, { color: diffColor }]}>{recipe.difficulty}</Text>
        </View>
      </View>

      {/* Macros */}
      {!compact && (
        <View style={styles.macros}>
          <Text style={[styles.macro, { color: colors.protein }]}>P {recipe.protein}g</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.macro, { color: colors.carbs }]}>C {recipe.carbs}g</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.macro, { color: colors.fats }]}>G {recipe.fats}g</Text>
        </View>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && !compact && (
        <View style={styles.tags}>
          {recipe.tags.slice(0, 3).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
          {recipe.source === 'ia' && (
            <View style={styles.aiTag}>
              <Zap size={10} color={colors.accentPurple} />
              <Text style={styles.aiTagText}>IA</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
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
  cardCompact: { padding: spacing.sm, gap: 6 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  name: { ...typography.label, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  description: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  calories: { fontSize: 14, fontWeight: '700', color: colors.accentGreen, flexShrink: 0 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.textMuted },
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  macros: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macro: { fontSize: 12, fontWeight: '600' },
  dot: { color: colors.textMuted, fontSize: 12 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { ...typography.caption, color: colors.textMuted },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiTagText: { fontSize: 10, fontWeight: '700', color: colors.accentPurple },
});
