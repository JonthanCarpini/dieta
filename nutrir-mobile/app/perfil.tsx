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
  Image,
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
  phone?: string;
  birthdate?: string;
  gender?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  activity?: number;
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
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthdate: '',
    height_cm: '',
    weight_kg: '',
    gender: '',
    goal: '',
    activity: '',
  });

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/profile').then((r) => {
      const u = r.data.user ?? {};
      const p = r.data.profile ?? {};
      let bDateFormatted = '';
      if (p.birthdate) {
        const clean = p.birthdate.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
          bDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return {
        name: u.name,
        email: u.email,
        phone: u.phone,
        plan: u.plan,
        age: p.age,
        birthdate: bDateFormatted,
        gender: p.gender,
        height_cm: p.height,
        weight_kg: p.weight,
        goal: p.goal,
        activity: p.activity,
        avatar_url: u.profile_image,
      } as ProfileData;
    }),
  });

  const { data: weightHistory } = useQuery<any[]>({
    queryKey: ['weight-history'],
    queryFn: () => api.get('/user/weight-log').then((r) => r.data),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => api.put('/user/profile', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      updateUser({
        name: vars.name,
        email: vars.email,
        phone: vars.phone || undefined,
        profile_image: vars.profile_image || undefined,
      });
      setEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error ?? 'Não foi possível salvar o perfil.';
      Alert.alert('Erro', errMsg);
    },
  });

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length > 0) {
      formatted += `(${digits.slice(0, 2)}`;
    }
    if (digits.length > 2) {
      formatted += `)${digits.slice(2, 7)}`;
    }
    if (digits.length > 7) {
      formatted += `-${digits.slice(7, 11)}`;
    }
    setForm(f => ({ ...f, phone: formatted }));
  };

  const handleBirthdateChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setForm(f => ({ ...f, birthdate: masked }));
  };

  const startEditing = () => {
    setForm({
      name: profile?.name ?? user?.name ?? '',
      email: profile?.email ?? user?.email ?? '',
      phone: profile?.phone ?? '',
      birthdate: profile?.birthdate ?? '',
      height_cm: profile?.height_cm ? String(profile.height_cm) : '',
      weight_kg: profile?.weight_kg ? String(profile.weight_kg) : '',
      gender: profile?.gender ?? '',
      goal: profile?.goal ?? '',
      activity: profile?.activity ? String(profile.activity) : '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'O nome não pode ser vazio.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Erro', 'O e-mail não pode ser vazio.');
      return;
    }

    if (form.phone.trim()) {
      const phoneRegex = /^\(\d{2}\)\d{5}-\d{4}$/;
      if (!phoneRegex.test(form.phone)) {
        Alert.alert('Telefone inválido', 'Use o formato (xx)xxxxx-xxxx');
        return;
      }
    }

    if (form.birthdate.trim()) {
      const birthdateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!birthdateRegex.test(form.birthdate)) {
        Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA');
        return;
      }
      const [dd, mm, yyyy] = form.birthdate.split('/').map(Number);
      const today = new Date();
      if (!dd || !mm || !yyyy || yyyy < 1900 || yyyy > today.getFullYear()) {
        Alert.alert('Data inválida', 'Verifique a data de nascimento.');
        return;
      }
    }

    updateProfileMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      birthdate: form.birthdate.trim() || null,
      height: form.height_cm ? parseInt(form.height_cm) : null,
      weight: form.weight_kg ? parseFloat(form.weight_kg) : null,
      gender: form.gender || null,
      goal: form.goal || null,
      activity: form.activity ? parseFloat(form.activity) : null,
    });
  };

  const logWeightMutation = useMutation({
    mutationFn: (weight: number) => api.post('/user/weight-log', { weight }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      setNewWeight('');
    },
    onError: (err: any) => {
      console.error('Erro ao registrar peso:', err);
      const errMsg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
      Alert.alert('Erro', `Não foi possível registrar o peso: ${errMsg}`);
    },
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

  const weightData = weightHistory?.map((e) => Number(e.weight)) ?? [];
  const weightLabels = weightHistory?.map((e) => {
    if (!e.date) return '';
    const cleanDate = e.date.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return cleanDate;
  }) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => editing ? setEditing(false) : router.back()} hitSlop={8}>
          {editing ? (
            <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancelar</Text>
          ) : (
            <ChevronLeft size={24} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Editar Perfil' : 'Meu Perfil'}</Text>
        <TouchableOpacity
          onPress={() => editing ? handleSave() : startEditing()}
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
                {pickAvatarMutation.isPending ? (
                  <ActivityIndicator color="#000" />
                ) : profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url.startsWith('data:image') ? profile.avatar_url : `data:image/jpeg;base64,${profile.avatar_url}` }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <View style={styles.avatarEdit}>
                <Camera size={14} color="#000" />
              </View>
            </TouchableOpacity>

            {!editing && (
              <>
                <Text style={styles.heroName}>{profile?.name ?? user?.name}</Text>
                <Text style={styles.heroEmail}>{profile?.email ?? user?.email}</Text>
                {profile?.plan && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planText}>{profile.plan}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {editing ? (
            <View style={styles.formContainer}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome Completo</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.name}
                  onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                  placeholder="Nome"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.email}
                  onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telefone</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.phone}
                  onChangeText={handlePhoneChange}
                  placeholder="(xx)xxxxx-xxxx"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Data de Nascimento</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.birthdate}
                  onChangeText={handleBirthdateChange}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Altura (cm)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.height_cm}
                    onChangeText={(v) => setForm(f => ({ ...f, height_cm: v }))}
                    placeholder="Altura"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Peso Atual (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.weight_kg}
                    onChangeText={(v) => setForm(f => ({ ...f, weight_kg: v }))}
                    placeholder="Peso"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sexo biológico</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, form.gender === 'female' && styles.choiceBtnSel]}
                    onPress={() => setForm(f => ({ ...f, gender: 'female' }))}
                  >
                    <Text style={[styles.choiceBtnText, form.gender === 'female' && styles.choiceBtnTextSel]}>Feminino</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, form.gender === 'male' && styles.choiceBtnSel]}
                    onPress={() => setForm(f => ({ ...f, gender: 'male' }))}
                  >
                    <Text style={[styles.choiceBtnText, form.gender === 'male' && styles.choiceBtnTextSel]}>Masculino</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Objetivo</Text>
                <View style={{ gap: spacing.xs }}>
                  {[
                    { val: 'lose', label: 'Emagrecer' },
                    { val: 'maintain', label: 'Manter peso' },
                    { val: 'gain', label: 'Ganhar massa muscular' },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.val}
                      style={[styles.choiceRowBtn, form.goal === o.val && styles.choiceRowBtnSel]}
                      onPress={() => setForm(f => ({ ...f, goal: o.val }))}
                    >
                      <Text style={[styles.choiceRowBtnText, form.goal === o.val && styles.choiceRowBtnTextSel]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nível de atividade física</Text>
                <View style={{ gap: spacing.xs }}>
                  {[
                    { val: '1.2', label: 'Sedentário — sem exercício' },
                    { val: '1.375', label: 'Levemente ativo — 1-3x / semana' },
                    { val: '1.55', label: 'Moderadamente ativo — 3-5x / semana' },
                    { val: '1.725', label: 'Muito ativo — 6-7x / semana' },
                    { val: '1.9', label: 'Extremamente ativo — atleta / trabalho físico' },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.val}
                      style={[styles.choiceRowBtn, form.activity === o.val && styles.choiceRowBtnSel]}
                      onPress={() => setForm(f => ({ ...f, activity: o.val }))}
                    >
                      <Text style={[styles.choiceRowBtnText, form.activity === o.val && styles.choiceRowBtnTextSel]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <>
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
            </>
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

  formContainer: { gap: spacing.md, paddingVertical: spacing.sm },
  field: { gap: 6 },
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceBtnSel: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen + '15',
  },
  choiceBtnText: { fontSize: 14, color: colors.textSecondary },
  choiceBtnTextSel: { color: colors.textPrimary, fontWeight: '600' },
  choiceRowBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceRowBtnSel: {
    borderColor: colors.accentGreen,
    backgroundColor: colors.accentGreen + '15',
  },
  choiceRowBtnText: { fontSize: 14, color: colors.textSecondary },
  choiceRowBtnTextSel: { color: colors.textPrimary, fontWeight: '600' },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
  },
});
