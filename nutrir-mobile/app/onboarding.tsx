import { useState, useRef, useEffect } from 'react';
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
  warn: { borderColor: colors.accentYellow + '60' },   // 1.5 kg/semana — aviso
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

  // Etapa 1 — dados biométricos
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [birthdate, setBirthdate] = useState('');   // DD/MM/AAAA
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | ''>('');
  const [speed, setSpeed] = useState<string>('');   // kg/semana
  const [activity, setActivity] = useState<string>('');

  const getMetabolicRates = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const act = parseFloat(activity);
    if (isNaN(w) || isNaN(h) || isNaN(act) || !gender || !birthdateValid()) {
      return { tmb: 0, get: 0 };
    }

    const [dd, mm, yyyy] = birthdate.split('/').map(Number);
    const birth = new Date(yyyy, mm - 1, dd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const imc = w / ((h / 100) ** 2);
    const isAthlete = act >= 1.725;
    let tmb = 0;
    if (isAthlete) {
      tmb = 24.8 * w + 10;
    } else if (imc >= 25 || imc < 18.5) {
      tmb = gender === 'male'
        ? 9.99 * w + 6.25 * h - 4.92 * age + 5
        : 9.99 * w + 6.25 * h - 4.92 * age - 161;
    } else {
      tmb = gender === 'male'
        ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
        : 447.593 + 9.247 * w + 3.098 * h - 4.330 * age;
    }

    const get = tmb * act;
    return { tmb, get };
  };

  const isBiometricsComplete = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const act = parseFloat(activity);
    return !isNaN(w) && !isNaN(h) && !isNaN(act) && !!gender && birthdateValid();
  };

  // Reseta velocidade se os dados biométricos mudarem, já que as opções são calculadas dinamicamente
  useEffect(() => {
    setSpeed('');
  }, [weight, height, birthdate, gender, activity, goal]);

  // Máscara DD/MM/AAAA
  const handleBirthdate = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0,2)}/${digits.slice(2)}`;
    setBirthdate(masked);
  };
  const birthdateValid = () => {
    if (birthdate.length !== 10) return false;
    const [dd, mm, yyyy] = birthdate.split('/').map(Number);
    if (!dd || !mm || !yyyy || yyyy < 1900 || yyyy > new Date().getFullYear()) return false;
    const d = new Date(yyyy, mm - 1, dd);
    return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
  };

  // Etapa 2 — estrutura alimentar
  const [mealCount, setMealCount] = useState<number>(5);
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(
    new Set(['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'])
  );
  const [eatsOut, setEatsOut] = useState<string>('');
  const [cookingLevel, setCookingLevel] = useState<string>('');

  const MEAL_LABELS_PT: Record<string, string> = {
    cafe_da_manha: 'Café da manhã',
    lanche_manha: 'Lanche da manhã',
    almoco: 'Almoço',
    lanche_tarde: 'Lanche da tarde',
    jantar: 'Jantar',
    ceia: 'Ceia',
  };

  const handleMealCountChange = (count: number) => {
    setMealCount(count);
    const newSet = new Set<string>();
    if (count === 3) {
      newSet.add('cafe_da_manha').add('almoco').add('jantar');
    } else if (count === 4) {
      newSet.add('cafe_da_manha').add('almoco').add('lanche_tarde').add('jantar');
    } else if (count === 5) {
      newSet.add('cafe_da_manha').add('lanche_manha').add('almoco').add('lanche_tarde').add('jantar');
    } else {
      newSet.add('cafe_da_manha').add('lanche_manha').add('almoco').add('lanche_tarde').add('jantar').add('ceia');
    }
    setSelectedMeals(newSet);
  };

  const toggleMealSelection = (mealKey: string) => {
    setSelectedMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealKey)) {
        if (next.size <= 1) return prev;
        next.delete(mealKey);
      } else {
        if (next.size >= mealCount) {
          Alert.alert(
            'Limite de refeições',
            `Você escolheu fazer ${mealCount} refeições por dia. Desmarque uma das refeições antes de escolher outra.`
          );
          return prev;
        }
        next.add(mealKey);
      }
      return next;
    });
  };

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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const sizeKb = asset.size ? Math.round(asset.size / 1024) : 0;

      if (sizeKb > 10_240) {
        Alert.alert('Arquivo muito grande', 'O arquivo deve ter no máximo 10 MB.');
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileType = asset.mimeType ?? 'application/octet-stream';
      const examType: 'pdf' | 'image' = fileType.startsWith('image/') ? 'image' : 'pdf';

      // Mesmo formato do exams.tsx — JSON com base64, não FormData
      await api.post('/user/exams', {
        name: asset.name,
        type: examType,
        category: 'Triagem',
        size_kb: sizeKb,
        base64,
        mime_type: fileType,
      });

      setExamUploaded(true);
      Alert.alert('Exame enviado!', 'Seus resultados serão analisados automaticamente por IA.');
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message !== 'canceled') {
        Alert.alert('Erro no upload', 'Não foi possível enviar o arquivo. Tente novamente.');
      }
    } finally {
      setUploadingExam(false);
    }
  };

  const needsSpeed = goal === 'lose' || goal === 'gain';

  const canAdvance = () => {
    if (step === 0) return !!gender && birthdateValid() && !!weight && !!height && !!goal && !!activity && (!needsSpeed || !!speed);
    if (step === 1) return mealCount > 0 && selectedMeals.size === mealCount && eatsOut && cookingLevel;
    if (step === 2) return conditions.size > 0;
    if (step === 4) return hasExams !== null && (hasExams ? examUploaded : true);
    return true;
  };

  const saveAndFinish = async () => {
    setSaving(true);
    try {
      // Salva perfil biométrico (Etapa 1)
      await api.put('/user/profile', {
        gender,
        birthdate,
        weight: parseFloat(weight),
        height: parseInt(height),
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
        goal,
        speed: speed ? parseFloat(speed) : null,   // kg/semana → backend calcula déficit real
        activity: parseFloat(activity),
      });

      // Converte condições/restrições da anamnese para texto legível no Perfil Clínico
      const condLabels: Record<string, string> = {
        diabetes: 'Diabetes tipo 2 / pré-diabetes', colesterol: 'Colesterol alto',
        triglicerideos: 'Triglicerídeos altos', hipertensao: 'Hipertensão',
        gota: 'Gota / ácido úrico elevado', celiaca: 'Doença celíaca',
        sii: 'Síndrome do intestino irritável', renal: 'Doença renal crônica',
        calculo_renal: 'Cálculo renal', hipotireoidismo: 'Hipotireoidismo',
        sop: 'SOP', cardiopatia: 'Doença cardíaca', anemia: 'Anemia',
      };
      const restLabels: Record<string, string> = {
        vegetariano: 'Vegetariano', vegano: 'Vegano',
        sem_carne_verm: 'Sem carne vermelha', sem_frango: 'Sem frango',
        sem_peixe: 'Sem peixe / frutos do mar', sem_lactose: 'Intolerância à lactose',
        sem_gluten: 'Intolerância ao glúten', sem_porco: 'Sem porco',
        religioso: 'Restrição religiosa',
      };
      const goalLabels: Record<string, string> = {
        lose: `Emagrecer${speed ? ` — ${speed} kg/semana` : ''}`,
        maintain: 'Manutenção de peso',
        gain: `Ganho de massa muscular${speed ? ` — ${speed} kg/semana` : ''}`,
      };
      const comorbStr = [...conditions].filter(c => c !== 'nenhuma').map(c => condLabels[c] || c).join(', ');
      const restStr   = [...restrictions].map(r => restLabels[r] || r).join(', ');
      const intolerances = restrictions.has('sem_lactose') ? 'Lactose' : '';
      const restFinal = [...restrictions].filter(r => r !== 'sem_lactose').map(r => restLabels[r] || r).join(', ');
      const dietFinal = [restFinal, avoidsText].filter(Boolean).join('. ');

      // Popula Perfil Clínico automaticamente com os dados da anamnese
      await api.post('/user/clinical', {
        comorbidities:        comorbStr || '',
        intolerances:         intolerances,
        dietary_restrictions: dietFinal || '',
        medications:          medications || '',
        health_goals:         goalLabels[goal] || goal,
      });

      // Constrói objeto de horários de refeição a partir da seleção
      const mealTimesObj: Record<string, string> = {};
      const defaultTimes: Record<string, string> = {
        cafe_da_manha: '06:00', lanche_manha: '09:00', almoco: '12:00',
        lanche_tarde: '15:00', jantar: '18:00', ceia: '21:00',
      };
      selectedMeals.forEach(meal => {
        mealTimesObj[meal] = defaultTimes[meal] || '12:00';
      });

      // Salva anamnese (Etapas 2-5)
      await api.post('/user/anamnesis', {
        meal_count: mealCount,
        meal_times: mealTimesObj,
        eats_out: eatsOut,
        cooking_level: cookingLevel,
        conditions: [...conditions],
        restrictions: [...restrictions],
        avoids_text: avoidsText,
        prefers_text: prefersText,
        medications,
        complete: true,
      });
      if (!hasExams) await api.post('/user/exam-proxy', proxy);
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

  const TITLES = ['Seus dados', 'Sua rotina alimentar', 'Sua saúde', 'Preferências alimentares', 'Seus exames'];
  const SUBTITLES = [
    'Informe seus dados para calcular suas necessidades nutricionais.',
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

          {/* ── Etapa 1 — Dados biométricos ──────────────────────────────── */}
          {step === 0 && (
            <View style={s.section}>

              <Text style={s.sectionTitle}>Sexo biológico</Text>
              <View style={s.rowGroup}>
                <OptionBtn label="Feminino" selected={gender === 'female'} onPress={() => setGender('female')} />
                <OptionBtn label="Masculino" selected={gender === 'male'} onPress={() => setGender('male')} />
              </View>

              <Text style={s.sectionTitle}>Data de nascimento</Text>
              <TextInput
                style={[s.input, birthdate.length > 0 && !birthdateValid() && s.inputError]}
                value={birthdate}
                onChangeText={handleBirthdate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
              {birthdate.length > 0 && !birthdateValid() && (
                <Text style={s.fieldError}>Data inválida — use o formato DD/MM/AAAA</Text>
              )}

              <View style={[s.row2col, { marginTop: spacing.sm }]}>
                <View style={s.col}>
                  <Text style={s.sectionTitle}>Peso atual (kg)</Text>
                  <TextInput style={s.input} value={weight} onChangeText={setWeight}
                    placeholder="Ex: 75.5" placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad" maxLength={6} />
                </View>
                <View style={s.col}>
                  <Text style={s.sectionTitle}>Peso desejado (kg)</Text>
                  <TextInput style={s.input} value={goalWeight} onChangeText={setGoalWeight}
                    placeholder="Ex: 65" placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad" maxLength={6} />
                </View>
              </View>

              <Text style={s.sectionTitle}>Altura (cm)</Text>
              <TextInput style={s.input} value={height} onChangeText={setHeight}
                placeholder="Ex: 170" placeholderTextColor={colors.textMuted}
                keyboardType="numeric" maxLength={3} />

              <Text style={[s.sectionTitle, { marginTop: spacing.sm }]}>Objetivo</Text>
              <OptionBtn label="Emagrecer" selected={goal === 'lose'} onPress={() => setGoal('lose')} />
              <OptionBtn label="Manter peso" selected={goal === 'maintain'} onPress={() => setGoal('maintain')} />
              <OptionBtn label="Ganhar massa muscular" selected={goal === 'gain'} onPress={() => setGoal('gain')} />

              <Text style={[s.sectionTitle, { marginTop: spacing.sm }]}>Nível de atividade física</Text>
              {[
                { val: '1.2',  label: 'Sedentário — sem exercício' },
                { val: '1.375', label: 'Levemente active — 1-3x / semana' },
                { val: '1.55',  label: 'Moderadamente ativo — 3-5x / semana' },
                { val: '1.725', label: 'Muito ativo — 6-7x / semana' },
                { val: '1.9',  label: 'Extremamente ativo — atleta / trabalho físico' },
              ].map(o => (
                <OptionBtn key={o.val} label={o.label} selected={activity === o.val} onPress={() => setActivity(o.val)} />
              ))}

              {/* Velocidade — só para emagrecer ou ganhar massa */}
              {needsSpeed && (
                <>
                  <Text style={[s.sectionTitle, { marginTop: spacing.sm }]}>
                    Velocidade de {goal === 'lose' ? 'perda' : 'ganho'} de peso
                  </Text>
                  <Text style={s.fieldHint}>
                    {goal === 'lose'
                      ? 'Déficit calórico calculado automaticamente. Perdas acima de 1 kg/semana aumentam risco de perda muscular.'
                      : 'Superávit calórico calculado automaticamente. Ganhos acima de 0.5 kg/semana podem aumentar gordura.'}
                  </Text>
                  {goal === 'lose' ? (
                    !isBiometricsComplete() ? (
                      <View style={s.infoBox}>
                        <Text style={[s.infoText, { color: colors.textSecondary }]}>
                          Preencha seus dados biométricos e nível de atividade física acima para calcular as velocidades de perda de peso personalizadas.
                        </Text>
                      </View>
                    ) : (
                      (() => {
                        const { tmb, get } = getMetabolicRates();
                        if (tmb === 0 || get === 0) return null;

                        // 1. Muito Leve: acima da TMB -> consumo = (GET + TMB) / 2
                        const muitoLeveIntake = Math.round((get + tmb) / 2);
                        const muitoLeveDeficit = Math.round(get - muitoLeveIntake);
                        const muitoLeveSpeed = Math.max(0.01, muitoLeveDeficit / 1100);

                        // 2. Leve: igual à TMB -> consumo = TMB
                        const leveIntake = Math.round(tmb);
                        const leveDeficit = Math.round(get - leveIntake);
                        const leveSpeed = Math.max(0.01, leveDeficit / 1100);

                        // 3. Moderado: 10% abaixo da TMB -> consumo = TMB * 0.9
                        const moderadoIntake = Math.round(tmb * 0.9);
                        const moderadoDeficit = Math.round(get - moderadoIntake);
                        const moderadoSpeed = Math.max(0.01, moderadoDeficit / 1100);

                        // 4. Intenso: 20% abaixo da TMB -> consumo = TMB * 0.8
                        const intensoIntake = Math.round(tmb * 0.8);
                        const intensoDeficit = Math.round(get - intensoIntake);
                        const intensoSpeed = Math.max(0.01, intensoDeficit / 1100);

                        // 5. Pesado: 30% abaixo da TMB -> consumo = TMB * 0.7
                        const pesadoIntake = Math.round(tmb * 0.7);
                        const pesadoDeficit = Math.round(get - pesadoIntake);
                        const pesadoSpeed = Math.max(0.01, pesadoDeficit / 1100);

                        const loseOptions = [
                          {
                            val: muitoLeveSpeed.toFixed(2),
                            level: 'Muito leve',
                            label: `${muitoLeveSpeed.toFixed(2).replace('.', ',')} kg / semana`,
                            desc: `~${muitoLeveDeficit} kcal/dia de déficit · Consumo de ~${muitoLeveIntake} kcal/dia`,
                          },
                          {
                            val: leveSpeed.toFixed(2),
                            level: 'Leve',
                            label: `${leveSpeed.toFixed(2).replace('.', ',')} kg / semana`,
                            desc: `~${leveDeficit} kcal/dia de déficit · Consumo de ~${leveIntake} kcal/dia (TMB)`,
                          },
                          {
                            val: moderadoSpeed.toFixed(2),
                            level: 'Moderado',
                            label: `${moderadoSpeed.toFixed(2).replace('.', ',')} kg / semana`,
                            desc: `~${moderadoDeficit} kcal/dia de déficit · Consumo de ~${moderadoIntake} kcal/dia`,
                          },
                          {
                            val: intensoSpeed.toFixed(2),
                            level: 'Intenso',
                            label: `${intensoSpeed.toFixed(2).replace('.', ',')} kg / semana`,
                            desc: `~${intensoDeficit} kcal/dia de déficit · Consumo de ~${intensoIntake} kcal/dia`,
                          },
                          {
                            val: pesadoSpeed.toFixed(2),
                            level: 'Pesado',
                            label: `${pesadoSpeed.toFixed(2).replace('.', ',')} kg / semana`,
                            desc: `~${pesadoDeficit} kcal/dia de déficit · Consumo de ~${pesadoIntake} kcal/dia`,
                          },
                        ];

                        return loseOptions.map(o => {
                          return (
                            <TouchableOpacity key={o.level}
                              style={[
                                ob.btn,
                                speed === o.val && ob.sel,
                                o.level === 'Pesado' && speed !== o.val && ob.warn
                              ]}
                              onPress={() => setSpeed(o.val)}
                              activeOpacity={0.8}>
                              <View style={s.speedRow}>
                                <Text style={[ob.text, speed === o.val && ob.selText]}>
                                  {o.label}
                                </Text>
                                <View style={[s.levelBadge, speed === o.val && s.levelBadgeSel]}>
                                  <Text style={[s.levelText, speed === o.val && s.levelTextSel]}>
                                    {o.level}
                                  </Text>
                                </View>
                              </View>
                              <Text style={[s.speedDesc, speed === o.val && { color: colors.accentGreen + 'CC' }]}>
                                {o.desc}
                              </Text>
                            </TouchableOpacity>
                          );
                        });
                      })()
                    )
                  ) : (
                    [
                      { val: '0.25', level: 'Leve',     label: '0,25 kg / semana', desc: '~275 kcal/dia de superávit' },
                      { val: '0.5',  level: 'Moderado', label: '0,5 kg / semana',  desc: '~550 kcal/dia de superávit · Recomendado' },
                    ].map(o => (
                      <TouchableOpacity key={o.val}
                        style={[
                          ob.btn,
                          speed === o.val && ob.sel
                        ]}
                        onPress={() => setSpeed(o.val)}
                        activeOpacity={0.8}>
                        <View style={s.speedRow}>
                          <Text style={[ob.text, speed === o.val && ob.selText]}>
                            {o.label}
                          </Text>
                          <View style={[s.levelBadge, speed === o.val && s.levelBadgeSel]}>
                            <Text style={[s.levelText, speed === o.val && s.levelTextSel]}>
                              {o.level}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.speedDesc, speed === o.val && { color: colors.accentGreen + 'CC' }]}>
                          {o.desc}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Etapa 2 — Estrutura alimentar ───────────────────────────── */}
          {step === 1 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quantas refeições você faz por dia?</Text>
              <View style={s.rowGroup}>
                {[3, 4, 5, 6].map(n => (
                  <OptionBtn key={n} label={n === 6 ? '6 ou mais' : `${n}`} selected={mealCount === n} onPress={() => handleMealCountChange(n)} />
                ))}
              </View>

              <Text style={[s.sectionTitle, { marginTop: spacing.md }]}>Quais refeições você faz?</Text>
              <Text style={s.fieldHint}>
                Marque exatamente as {mealCount} refeições do seu dia:
              </Text>
              {['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'].map(mealKey => {
                const checked = selectedMeals.has(mealKey);
                return (
                  <CheckItem
                    key={mealKey}
                    label={MEAL_LABELS_PT[mealKey]}
                    checked={checked}
                    onPress={() => toggleMealSelection(mealKey)}
                  />
                );
              })}
              {selectedMeals.size !== mealCount && (
                <Text style={s.fieldError}>
                  Selecione exatamente {mealCount} refeições (atualmente {selectedMeals.size} selecionadas).
                </Text>
              )}

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
  row2col:  { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  col:      { flex: 1 },

  infoBox:  { backgroundColor: colors.accentGreen + '10', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.accentGreen + '30', marginBottom: spacing.md },
  infoText: { ...typography.body, color: colors.accentGreen, lineHeight: 22 },

  textarea:   { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 4 },
  input:      { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  inputError: { borderColor: colors.accentRed },
  fieldError: { fontSize: 11, color: colors.accentRed, marginTop: 2, marginBottom: 4 },
  fieldHint:  { fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 18 },
  speedDesc:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  speedRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: { backgroundColor: colors.border, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  levelBadgeSel: { backgroundColor: colors.accentGreen + '25' },
  levelText:  { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  levelTextSel: { color: colors.accentGreen },

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
