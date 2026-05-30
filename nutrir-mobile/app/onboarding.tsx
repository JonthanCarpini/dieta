import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

// ── Dados de cada etapa ──────────────────────────────────────────────────────
const TOTAL_STEPS = 5;

// Condições de saúde (checklist etapa 3)
const CONDITIONS = [
  { id: 'diabetes',      label: 'Diabetes tipo 2 ou pré-diabetes' },
  { id: 'colesterol',    label: 'Colesterol alto (LDL elevado)' },
  { id: 'triglicerideos',label: 'Triglicerídeos altos' },
  { id: 'hipertensao',   label: 'Pressão alta (hipertensão)' },
  { id: 'gota',          label: 'Gota ou ácido úrico elevado' },
  { id: 'celiaca',       label: 'Doença celíaca (intolerância ao glúten)' },
  { id: 'sii',           label: 'Síndrome do intestino irritável (SII)' },
  { id: 'renal',         label: 'Doença renal crônica' },
  { id: 'calculo_renal', label: 'Cálculo renal (pedra nos rins)' },
  { id: 'hipotireoidismo', label: 'Hipotireoidismo (tireoide lenta)' },
  { id: 'sop',           label: 'SOP — Síndrome dos Ovários Policísticos' },
  { id: 'cardiopatia',   label: 'Doença cardíaca / insuficiência cardíaca' },
  { id: 'anemia',        label: 'Anemia (ferro baixo diagnosticado)' },
  { id: 'nenhuma',       label: 'Nenhuma das anteriores' },
];

const RESTRICTIONS = [
  { id: 'vegetariano',   label: 'Sou vegetariano' },
  { id: 'vegano',        label: 'Sou vegano' },
  { id: 'sem_carne_verm',label: 'Não como carne vermelha' },
  { id: 'sem_frango',    label: 'Não como frango' },
  { id: 'sem_peixe',     label: 'Não como peixe / frutos do mar' },
  { id: 'sem_lactose',   label: 'Intolerância à lactose' },
  { id: 'sem_gluten',    label: 'Intolerância ao glúten (não celíaco)' },
  { id: 'sem_porco',     label: 'Não como porco' },
  { id: 'religioso',     label: 'Restrição religiosa (halal / kosher)' },
];

// ── Componentes auxiliares ───────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <View style={pb.container}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[pb.seg, i < step ? pb.done : i === step ? pb.current : pb.todo]} />
      ))}
    </View>
  );
}
const pb = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginBottom: spacing.lg },
  seg:     { flex: 1, height: 4, borderRadius: 2 },
  done:    { backgroundColor: colors.accentGreen },
  current: { backgroundColor: colors.accentGreen + '80' },
  todo:    { backgroundColor: colors.border },
});

function CheckItem({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ci.row, checked && ci.rowChecked]} onPress={onPress} activeOpacity={0.75}>
      <View style={[ci.box, checked && ci.boxChecked]}>
        {checked && <Text style={ci.tick}>✓</Text>}
      </View>
      <Text style={[ci.label, checked && ci.labelChecked]}>{label}</Text>
    </TouchableOpacity>
  );
}
const ci = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  rowChecked: { borderColor: colors.accentGreen + '60', backgroundColor: colors.accentGreen + '0D' },
  box:        { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { borderColor: colors.accentGreen, backgroundColor: colors.accentGreen },
  tick:       { color: '#000', fontSize: 12, fontWeight: '700' },
  label:      { flex: 1, fontSize: 14, color: colors.textSecondary },
  labelChecked: { color: colors.textPrimary },
});

function OptionBtn({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ob.btn, selected && ob.sel]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[ob.text, selected && ob.selText]}>{label}</Text>
    </TouchableOpacity>
  );
}
const ob = StyleSheet.create({
  btn:  { paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  sel:  { borderColor: colors.accentGreen, backgroundColor: colors.accentGreen + '15' },
  text: { fontSize: 15, color: colors.textSecondary },
  selText: { color: colors.textPrimary, fontWeight: '600' },
});

// ── Screen principal ─────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [examUploaded, setExamUploaded] = useState(false);

  // Etapa 2 — estrutura alimentar
  const [mealCount, setMealCount] = useState<number>(5);
  const [eatsOut, setEatsOut] = useState<string>('');
  const [cookingLevel, setCookingLevel] = useState<string>('');

  // Etapa 3 — condições de saúde
  const [conditions, setConditions] = useState<Set<string>>(new Set());

  // Etapa 4 — restrições e preferências
  const [restrictions, setRestrictions] = useState<Set<string>>(new Set());
  const [avoidsText, setAvoidsText] = useState('');
  const [prefersText, setPrefersText] = useState('');
  const [medications, setMedications] = useState('');

  // Etapa 5 — exames ou proxy
  const [hasExams, setHasExams] = useState<boolean | null>(null);
  const [proxy, setProxy] = useState({ cholesterol_high: false, uric_acid_high: false, glucose_high: false, kidney_stones: false });

  const toggleCondition = (id: string) => {
    setConditions(prev => {
      const next = new Set(prev);
      if (id === 'nenhuma') { next.clear(); next.add('nenhuma'); return next; }
      next.delete('nenhuma');
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleRestriction = (id: string) => {
    setRestrictions(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const uploadExam = async () => {
    try {
      setUploadingExam(true);
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' } as unknown as Blob);
      formData.append('category', 'Triagem');
      await api.post('/user/exams', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      setExamUploaded(true);
      Alert.alert('Exame enviado!', 'Seus resultados serão analisados automaticamente.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o exame. Tente novamente.');
    } finally {
      setUploadingExam(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return mealCount > 0 && eatsOut && cookingLevel;
    if (step === 2) return conditions.size > 0;
    if (step === 4) return hasExams !== null && (hasExams ? examUploaded : true);
    return true;
  };

  const saveAndFinish = async () => {
    setSaving(true);
    try {
      await api.post('/user/anamnesis', {
        meal_count: mealCount,
        eats_out: eatsOut,
        cooking_level: cookingLevel,
        conditions: [...conditions],
        restrictions: [...restrictions],
        avoids_text: avoidsText,
        prefers_text: prefersText,
        medications,
        complete: true,
      });
      if (!hasExams) {
        await api.post('/user/exam-proxy', proxy);
      }
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      saveAndFinish();
    }
  };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  const TITLES = ['Seu perfil', 'Sua rotina alimentar', 'Sua saúde', 'Preferências alimentares', 'Seus exames'];
  const SUBTITLES = [
    'Confirme seus dados biométricos e objetivo.',
    'Como é sua rotina com a alimentação?',
    'Selecione todas as condições que se aplicam a você.',
    'Isso ajuda a personalizar seu cardápio.',
    'Exames de sangue tornam o plano mais preciso.',
  ];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Cabeçalho */}
          <View style={s.header}>
            <Text style={s.stepLabel}>Etapa {step + 1} de {TOTAL_STEPS}</Text>
            <ProgressBar step={step + 1} />
            <Text style={s.title}>{TITLES[step]}</Text>
            <Text style={s.subtitle}>{SUBTITLES[step]}</Text>
          </View>

          {/* ── Etapa 1 — Biometria (readonly — já preenchida no cadastro) ─── */}
          {step === 0 && (
            <View style={s.section}>
              <View style={s.infoBox}>
                <Text style={s.infoText}>✓ Seus dados básicos (nome, peso, altura, objetivo) foram salvos no cadastro. Você pode atualizá-los em Perfil a qualquer momento.</Text>
              </View>
              <Text style={s.sectionTitle}>Por que fazemos isso?</Text>
              <Text style={s.bodyText}>
                Essas 5 etapas permitem que seu nutricionista gere um cardápio personalizado para você, respeitando sua saúde, rotina e preferências. Leva menos de 3 minutos.
              </Text>
            </View>
          )}

          {/* ── Etapa 2 — Estrutura alimentar ───────────────────────────── */}
          {step === 1 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quantas refeições você faz por dia?</Text>
              <View style={s.rowGroup}>
                {[3, 4, 5, 6].map(n => (
                  <OptionBtn key={n} label={n === 6 ? '6 ou mais' : `${n}`} selected={mealCount === n} onPress={() => setMealCount(n)} />
                ))}
              </View>

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>Você costuma comer fora de casa?</Text>
              {['never', 'sometimes', 'always'].map(v => (
                <OptionBtn key={v} label={v === 'never' ? 'Nunca / raramente' : v === 'sometimes' ? 'Algumas vezes na semana' : 'Todo dia'} selected={eatsOut === v} onPress={() => setEatsOut(v)} />
              ))}

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>Você sabe cozinhar?</Text>
              {['none', 'basic', 'good'].map(v => (
                <OptionBtn key={v} label={v === 'none' ? 'Não cozinho (só esquento)' : v === 'basic' ? 'Coisas simples' : 'Cozinho bem'} selected={cookingLevel === v} onPress={() => setCookingLevel(v)} />
              ))}
            </View>
          )}

          {/* ── Etapa 3 — Condições de saúde ────────────────────────────── */}
          {step === 2 && (
            <View style={s.section}>
              <Text style={s.bodyText}>Marque o que um médico já te disse ou você já sabe sobre sua saúde.</Text>
              {CONDITIONS.map(c => (
                <CheckItem key={c.id} label={c.label} checked={conditions.has(c.id)} onPress={() => toggleCondition(c.id)} />
              ))}
            </View>
          )}

          {/* ── Etapa 4 — Restrições e preferências ─────────────────────── */}
          {step === 3 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>O que você não come (por saúde ou escolha)?</Text>
              {RESTRICTIONS.map(r => (
                <CheckItem key={r.id} label={r.label} checked={restrictions.has(r.id)} onPress={() => toggleRestriction(r.id)} />
              ))}

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>O que você definitivamente não gosta?</Text>
              <TextInput style={s.textarea} value={avoidsText} onChangeText={setAvoidsText}
                placeholder="Ex: odeio fígado, não como beterraba, detesto peixe enlatado"
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>O que você mais gosta de comer?</Text>
              <TextInput style={s.textarea} value={prefersText} onChangeText={setPrefersText}
                placeholder="Ex: adoro frango grelhado, como muito arroz e feijão, gosto de saladas"
                placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>Medicamentos de uso contínuo (opcional)</Text>
              <TextInput style={s.input} value={medications} onChangeText={setMedications}
                placeholder="Ex: metformina, losartana, levotiroxina"
                placeholderTextColor={colors.textMuted} />
            </View>
          )}

          {/* ── Etapa 5 — Exames ─────────────────────────────────────────── */}
          {step === 4 && (
            <View style={s.section}>
              <Text style={s.bodyText}>
                Exames de sangue permitem identificar Gota, colesterol, glicemia e outros fatores que afetam diretamente o seu cardápio.
              </Text>

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>
                Você tem resultados de exames dos últimos 6 meses?
              </Text>
              <OptionBtn label="Sim — tenho exames" selected={hasExams === true} onPress={() => setHasExams(true)} />
              <OptionBtn label="Não — responder perguntas rápidas" selected={hasExams === false} onPress={() => setHasExams(false)} />

              {hasExams === true && (
                <View style={s.uploadBox}>
                  {examUploaded
                    ? <View style={s.uploadedBadge}><Text style={s.uploadedText}>✓ Exame enviado com sucesso!</Text></View>
                    : <TouchableOpacity style={s.uploadBtn} onPress={uploadExam} disabled={uploadingExam} activeOpacity={0.8}>
                        {uploadingExam
                          ? <ActivityIndicator color={colors.accentGreen} />
                          : <Text style={s.uploadBtnText}>📎 Enviar PDF ou foto do exame</Text>}
                      </TouchableOpacity>
                  }
                  <Text style={s.uploadHint}>Os resultados são analisados automaticamente por IA.</Text>
                </View>
              )}

              {hasExams === false && (
                <View style={s.proxyBox}>
                  <Text style={s.proxyTitle}>Responda para personalizar seu plano:</Text>

                  {[
                    { key: 'cholesterol_high', label: 'Médico já disse que seu colesterol ou triglicerídeos estão altos?' },
                    { key: 'uric_acid_high',   label: 'Médico já disse que seu ácido úrico está alto ou você tem gota?' },
                    { key: 'glucose_high',     label: 'Sua glicemia (açúcar no sangue) já esteve acima do normal?' },
                    { key: 'kidney_stones',    label: 'Você já teve pedra nos rins?' },
                  ].map(q => (
                    <View key={q.key} style={s.proxyRow}>
                      <Text style={s.proxyQuestion}>{q.label}</Text>
                      <View style={s.proxyOpts}>
                        {['Sim', 'Não'].map(v => (
                          <TouchableOpacity key={v}
                            style={[s.proxyOpt, proxy[q.key as keyof typeof proxy] === (v === 'Sim') && v === 'Sim' && s.proxyOptYes,
                                             proxy[q.key as keyof typeof proxy] === false && v === 'Não' && s.proxyOptNo]}
                            onPress={() => setProxy(p => ({ ...p, [q.key]: v === 'Sim' }))} activeOpacity={0.8}>
                            <Text style={s.proxyOptText}>{v}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Botões de navegação */}
          <View style={s.navRow}>
            {step > 0
              ? <TouchableOpacity style={s.backBtn} onPress={back}><Text style={s.backBtnText}>← Voltar</Text></TouchableOpacity>
              : <View />
            }
            <TouchableOpacity
              style={[s.nextBtn, !canAdvance() && s.nextBtnDisabled]}
              onPress={next}
              disabled={!canAdvance() || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={s.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'Concluir ✓' : 'Próximo →'}</Text>
              }
            </TouchableOpacity>
          </View>

          {step < TOTAL_STEPS - 1 && (
            <TouchableOpacity style={s.skipBtn} onPress={() => { if (step === TOTAL_STEPS - 2) { saveAndFinish(); } else { next(); } }}>
              <Text style={s.skipText}>Pular esta etapa</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header:     { marginBottom: spacing.lg },
  stepLabel:  { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  title:      { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  subtitle:   { ...typography.body, color: colors.textSecondary },

  section:      { gap: 2 },
  sectionTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 8, marginTop: 4 },
  bodyText:     { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },

  rowGroup: { gap: 6 },

  infoBox:  { backgroundColor: colors.accentGreen + '10', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.accentGreen + '30', marginBottom: spacing.md },
  infoText: { ...typography.body, color: colors.accentGreen, lineHeight: 22 },

  textarea: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 4 },
  input:    { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },

  uploadBox:    { marginTop: spacing.md, gap: spacing.sm },
  uploadBtn:    { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.accentGreen + '50', borderStyle: 'dashed' },
  uploadBtnText: { color: colors.accentGreen, fontSize: 15, fontWeight: '600' },
  uploadHint:   { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  uploadedBadge: { backgroundColor: colors.accentGreen + '15', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.accentGreen + '40' },
  uploadedText:  { color: colors.accentGreen, fontWeight: '700', fontSize: 14 },

  proxyBox:      { marginTop: spacing.sm, gap: 4 },
  proxyTitle:    { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
  proxyRow:      { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  proxyQuestion: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 22 },
  proxyOpts:     { flexDirection: 'row', gap: spacing.sm },
  proxyOpt:      { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  proxyOptYes:   { borderColor: colors.accentRed + '80', backgroundColor: colors.accentRed + '10' },
  proxyOptNo:    { borderColor: colors.accentGreen + '80', backgroundColor: colors.accentGreen + '10' },
  proxyOptText:  { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  navRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  backBtn:      { paddingVertical: 12, paddingHorizontal: spacing.md },
  backBtnText:  { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  nextBtn:      { backgroundColor: colors.accentGreen, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.xl, minWidth: 140, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:  { color: '#000', fontSize: 15, fontWeight: '700' },
  skipBtn:      { alignItems: 'center', marginTop: spacing.sm },
  skipText:     { color: colors.textMuted, fontSize: 13 },
});
