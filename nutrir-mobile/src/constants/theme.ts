export const colors = {
  bgPrimary: '#0E1117',
  bgSecondary: '#141824',
  surface: '#1A1F2E',
  surfaceElevated: '#1F2537',
  border: '#252D40',
  borderSubtle: '#1C2233',

  textPrimary: '#E4E8F0',
  textSecondary: '#8B93A9',
  textMuted: '#5C6478',

  accentGreen: '#4ADE80',
  accentGreenDim: '#22C55E',
  accentPurple: '#8B5CF6',
  accentBlue: '#3B82F6',
  accentOrange: '#F97316',
  accentRed: '#EF4444',
  accentYellow: '#FBBF24',

  tabBarBg: '#111520',
  tabBarBorder: '#1C2233',
  tabBarActive: '#4ADE80',
  tabBarInactive: '#5C6478',

  protein: '#8B5CF6',
  carbs: '#3B82F6',
  fats: '#F97316',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};
