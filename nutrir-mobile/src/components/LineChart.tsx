import { View } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../constants/theme';

interface Props {
  data: number[];
  labels?: string[];
  width: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  showLabels?: boolean;
}

export default function LineChart({
  data,
  labels,
  width,
  height = 120,
  color = colors.accentGreen,
  showDots = true,
  showLabels = true,
}: Props) {
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const PAD_H = 8;
  const PAD_V = showLabels ? 20 : 8;
  const chartW = width - PAD_H * 2;
  const chartH = height - PAD_V * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = (i: number) => PAD_H + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD_V + chartH - ((v - min) / range) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.2" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid line */}
      <Line
        x1={PAD_H}
        y1={PAD_V + chartH}
        x2={width - PAD_H}
        y2={PAD_V + chartH}
        stroke={colors.border}
        strokeWidth={1}
      />

      {/* Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {showDots &&
        data.map((v, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={color} />
        ))}

      {/* Labels */}
      {showLabels &&
        labels?.map((lbl, i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={height - 2}
            textAnchor="middle"
            fontSize={9}
            fill={colors.textMuted}
          >
            {lbl}
          </SvgText>
        ))}
    </Svg>
  );
}
