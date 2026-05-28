import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { CheckCircle, Edit3, FileText } from 'lucide-react-native';
import api from '../../src/api/client';
import ScreenHeader from '../../src/components/ScreenHeader';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

interface ClinicalProfile {
  comorbidities: string;
  intolerances: string;
  dietary_restrictions: string;
  medications: string;
  health_goals: string;
}

export default function ClinicoScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClinicalProfile>({
    comorbidities: '',
    intolerances: '',
    dietary_restrictions: '',
    medications: '',
    health_goals: '',
  });

  const { data, isLoading } = useQuery<ClinicalProfile>({
    queryKey: ['clinical-profile'],
    queryFn: () => api.get('/user/clinical').then((r) => r.data),
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: ClinicalProfile) => api.post('/user/clinical', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinical-profile'] });
      setEditing(false);
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar o perfil clínico.');
    },
  });

  const fields: Array<{ key: keyof ClinicalProfile; label: string; placeholder: string }> = [
    { key: 'comorbidities', label: 'Comorbidades', placeholder: 'Ex: Diabetes tipo 2, Hipertensão...' },
    { key: 'intolerances', label: 'Intolerâncias alimentares', placeholder: 'Ex: Lactose, Glúten...' },
    { key: 'dietary_restrictions', label: 'Restrições alimentares', placeholder: 'Ex: Vegano, Sem frutos do mar...' },
    { key: 'medications', label: 'Medicamentos em uso', placeholder: 'Ex: Metformina, Losartana...' },
    { key: 'health_goals', label: 'Objetivos de saúde', placeholder: 'Ex: Perda de peso, Ganho muscular...' },
  ];

  const hasData = data && Object.values(data).some((v) => v && v.trim());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Perfil Clínico"
        right={
          !editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
              <Edit3 size={18} color={colors.accentGreen} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Link to exams */}
        <TouchableOpacity style={styles.examsLink} onPress={() => router.push('/exams')} activeOpacity={0.8}>
          <FileText size={16} color={colors.accentPurple} />
          <Text style={styles.examsLinkText}>Ver meus exames</Text>
        </TouchableOpacity>

        {isLoading ? (
          <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            {!editing && hasData && (
              <View style={styles.savedBanner}>
                <CheckCircle size={18} color={colors.accentGreen} />
                <Text style={styles.savedText}>Perfil clínico atualizado</Text>
              </View>
            )}

            <View style={styles.form}>
              {fields.map(({ key, label, placeholder }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.label}>{label}</Text>
                  {editing ? (
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      value={form[key]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                      placeholder={placeholder}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  ) : (
                    <View style={styles.readonlyBox}>
                      <Text style={data?.[key] ? styles.readonlyValue : styles.readonlyEmpty}>
                        {data?.[key] || 'Não informado'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {editing && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setEditing(false); setForm(data ?? form); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, mutation.isPending && styles.saveBtnDisabled]}
                  onPress={() => mutation.mutate(form)}
                  disabled={mutation.isPending}
                  activeOpacity={0.85}
                >
                  {mutation.isPending
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={styles.saveText}>Salvar</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  examsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    marginBottom: spacing.xs,
  },
  examsLinkText: { color: colors.accentPurple, fontWeight: '600', fontSize: 13 },

  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#0D2218',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentGreenDim,
    marginBottom: spacing.md,
  },
  savedText: { color: colors.accentGreen, fontWeight: '600', fontSize: 14 },

  form: { gap: spacing.md },
  field: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  readonlyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  readonlyValue: { ...typography.body, color: colors.textPrimary },
  readonlyEmpty: { ...typography.body, color: colors.textMuted, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
