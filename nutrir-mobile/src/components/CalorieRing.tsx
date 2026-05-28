import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '../constants/theme';

const SIZE = 180;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  consumed: number;
  goal: number;
}

export default function CalorieRing({ consumed, goal }: Props) {
  const pct = goal > 0 ? consumed / goal : 0;
  const progress = Math.min(pct, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const remaining = Math.max(goal - consumed, 0);

  let ringColor = colors.accentGreen;
  let statusText = 'restantes';
  let statusColor = colors.textMuted;
  let consumedColor = colors.textPrimary;

  if (pct >= 1.0) {
    ringColor = '#EF4444'; // Vermelho
    statusText = 'meta excedida';
    statusColor = '#EF4444';
    consumedColor = '#EF4444';
  } else if (pct >= 0.8) {
    ringColor = '#F59E0B'; // Laranja/Amarelo
    statusText = 'limite próximo';
    statusColor = '#F59E0B';
    consumedColor = '#F59E0B';
  }

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
          {/* Track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.consumed, { color: consumedColor }]}>{consumed}</Text>
        <Text style={styles.unit}>kcal</Text>
        {pct >= 1.0 ? (
          <Text style={[styles.remaining, { color: statusColor, fontWeight: '700' }]}>{statusText}</Text>
        ) : (
          <Text style={[styles.remaining, { color: statusColor }]}>
            {remaining} {statusText}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE },
  svg: { position: 'absolute' },
  center: { alignItems: 'center' },
  consumed: { fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  unit: { ...typography.label, color: colors.textSecondary, marginTop: -2 },
  remaining: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
