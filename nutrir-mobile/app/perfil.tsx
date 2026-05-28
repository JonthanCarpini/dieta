import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, FileText, Activity, Scale, Edit3, Check } from 'lucide-react-native';
import api from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import LineChart from '../src/components/LineChart';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface ProfileData {
  name: string;
  email: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  plan?: string;
  avatar_url?: string;
}

interface WeightEntry {
  date: string;
  label: string;
  weight: number;
}

function StatBox({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.md * 4;

  const [editing, setEditing] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [form, setForm] = useState({ name: user?.name ?? '', age: '', height_cm: '', goal: '' });

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/profile').then((r) => {
      const u = r.data.user ?? {};
      const p = r.data.profile ?? {};
      return {
        name: u.name,
        email: u.email,
        plan: u.plan,
        age: p.age,
        height_cm: p.height,
        weight_kg: p.weight,
        goal: p.goal,
        avatar_url: p.avatar_url,
      } as ProfileData;
    }),
  });

  const { data: weightHistory } = useQuery<WeightEntry[]>({
    queryKey: ['weight-history'],
    queryFn: () => api.get('/profile/weight-history', { params: { days: 30 } }).then((r) => r.data),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Partial<ProfileData>) => api.put('/user/profile', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      if (vars.name) updateUser({ name: vars.name });
      setEditing(false);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível salvar o perfil.'),
  });

  const logWeightMutation = useMutation({
    mutationFn: (weight: number) => api.post('/profile/weight', { weight_kg: weight }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      setNewWeight('');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível registrar o peso.'),
  });

  const pickAvatarMutation = useMutation({
    mutationFn: async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Permissão negada');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) throw new Error('canceled');
      const base64 = result.assets[0].base64;
      return api.post('/user/avatar', { image: base64 });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
    onError: (e: Error) => { if (e.message !== 'canceled') Alert.alert('Erro', 'Não foi possível atualizar a foto.'); },
  });

  const handleLogWeight = () => {
    const w = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('Peso inválido', 'Digite um peso entre 20 e 300 kg.');
      return;
    }
    logWeightMutation.mutate(w);
  };

  const bmi = profile?.height_cm && profile?.weight_kg
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
    : '--';

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?';

  const weightData = weightHistory?.map((e) => e.weight) ?? [];
  const weightLabels = weightHistory?.map((e) => e.label) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity
          onPress={() => editing ? updateProfileMutation.mutate({ name: form.name, goal: form.goal }) : setEditing(true)}
          hitSlop={8}
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending
            ? <ActivityIndicator size="small" color={colors.accentGreen} />
            : editing
              ? <Check size={22} color={colors.accentGreen} />
              : <Edit3 size={20} color={colors.textSecondary} />
          }
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar hero */}
          <View style={styles.heroSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => pickAvatarMutation.mutate()}
              disabled={pickAvatarMutation.isPending}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                {pickAvatarMutation.isPending
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.avatarText}>{initials}</Text>
                }
              </View>
              <View style={styles.avatarEdit}>
                <Camera size={14} color="#000" />
              </View>
            </TouchableOpacity>

            {editing ? (
              <TextInput
                style={styles.nameInput}
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            ) : (
              <Text style={styles.heroName}>{profile?.name ?? user?.name}</Text>
            )}
            <Text style={styles.heroEmail}>{profile?.email ?? user?.email}</Text>
            {profile?.plan && (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{profile.plan}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatBox label="Idade" value={profile?.age ?? '--'} unit="anos" />
            <StatBox label="Altura" value={profile?.height_cm ?? '--'} unit="cm" />
            <StatBox label="Peso" value={profile?.weight_kg ?? '--'} unit="kg" />
            <StatBox label="IMC" value={bmi} unit="" />
          </View>

          {/* Log weight */}
          <View style={styles.weightCard}>
            <View style={styles.weightCardHeader}>
              <Scale size={16} color={colors.accentGreen} />
              <Text style={styles.weightCardTitle}>Registrar peso</Text>
            </View>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder={String(profile?.weight_kg ?? '70.0')}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <Text style={styles.weightUnit}>kg</Text>
              <TouchableOpacity
                style={[styles.weightBtn, logWeightMutation.isPending && { opacity: 0.6 }]}
                onPress={handleLogWeight}
                disabled={logWeightMutation.isPending}
                activeOpacity={0.85}
              >
                {logWeightMutation.isPending
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.weightBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Weight chart */}
          {weightData.length >= 2 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Activity size={15} color={colors.accentPurple} />
                <Text style={styles.chartTitle}>Evolução do peso (30 dias)</Text>
              </View>
              <LineChart
                data={weightData}
                labels={weightLabels}
                width={chartWidth}
                height={120}
                color={colors.accentPurple}
              />
            </View>
          )}

          {/* Quick links */}
          <View style={styles.linksSection}>
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/(tabs)/clinico')}
              activeOpacity={0.8}
            >
              <Activity size={20} color={colors.accentGreen} />
              <View style={styles.linkText}>
                <Text style={styles.linkTitle}>Perfil Clínico</Text>
                <Text style={styles.linkSub}>Comorbidades, intolerâncias, medicamentos</Text>
              </View>
              <ChevronLeft size={18} color={colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push('/exams')}
              activeOpacity={0.8}
            >
              <FileText size={20} color={colors.accentPurple} />
              <View style={styles.linkText}>
                <Text style={styles.linkTitle}>Meus Exames</Text>
                <Text style={styles.linkSub}>Upload e visualização de exames</Text>
              </View>
              <ChevronLeft size={18} color={colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>
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
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  heroSection: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#000' },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgPrimary,
  },
  heroName: { ...typography.h2, color: colors.textPrimary },
  heroEmail: { ...typography.bodySmall, color: colors.textMuted },
  nameInput: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.accentGreen,
    paddingBottom: 4,
    minWidth: 200,
  },
  planBadge: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  planText: { fontSize: 12, fontWeight: '700', color: colors.accentGreen },

  statsGrid: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statUnit: { fontSize: 11, color: colors.textMuted },
  statLabel: { ...typography.caption, color: colors.textSecondary },

  weightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  weightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weightCardTitle: { ...typography.label, color: colors.textPrimary },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weightInput: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  weightUnit: { fontSize: 14, color: colors.textSecondary },
  weightBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  weightBtnText: { fontWeight: '700', color: '#000', fontSize: 14 },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartTitle: { ...typography.label, color: colors.textPrimary },

  linksSection: { gap: spacing.sm },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { flex: 1 },
  linkTitle: { ...typography.label, color: colors.textPrimary },
  linkSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
