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
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const remaining = Math.max(goal - consumed, 0);

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
            stroke={colors.accentGreen}
            strokeWidth={STROKE}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={styles.consumed}>{consumed}</Text>
        <Text style={styles.unit}>kcal</Text>
        <Text style={styles.remaining}>{remaining} restantes</Text>
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
