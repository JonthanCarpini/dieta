import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { ChevronLeft, Video, MapPin, Clock, Check } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

// Configura tradução do calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

interface TimeSlot {
  time: string;        // "09:00"
  endTime?: string;
  available: boolean;
}

interface SlotsResponse {
  date: string;
  slots: TimeSlot[];
}

const APPOINTMENT_TYPES = [
  { key: 'video', label: 'Vídeo chamada', icon: <Video size={16} color={colors.accentBlue} /> },
  { key: 'presencial', label: 'Presencial', icon: <MapPin size={16} color={colors.accentGreen} /> },
];

const today = new Date().toISOString().split('T')[0];
const maxDate = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0];

export default function ScheduleAppointmentScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('video');
  const [notes, setNotes] = useState('');

  // Busca profissionais vinculados ao usuário
  const { data: professionals } = useQuery<any[]>({
    queryKey: ['linked-professionals'],
    queryFn: () => api.get('/user/linked-professionals').then((r) => r.data),
  });

  const nutritionist = professionals?.find((p) => p.role === 'nutritionist');
  const professionalId = nutritionist?.id;

  // Busca horários livres para o nutricionista na data selecionada
  const { data: slotsData, isLoading: loadingSlots } = useQuery<SlotsResponse>({
    queryKey: ['available-slots', selectedDate, professionalId],
    queryFn: () =>
      api.get('/user/appointments/available', {
        params: {
          date: selectedDate,
          professional_id: professionalId
        }
      }).then((r) => r.data),
    enabled: !!selectedDate && !!professionalId,
  });

  const calculateEndTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    let endMins = h * 60 + m + 30; // slot padrão de 30 minutos
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const bookMutation = useMutation({
    mutationFn: () => {
      const selectedSlot = slotsData?.slots.find(s => s.time === selectedTime);
      const endTime = selectedSlot?.endTime || calculateEndTime(selectedTime);

      return api.post('/user/appointments', {
        professional_id: professionalId,
        appointment_date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        type: appointmentType,
        notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert(
        'Consulta agendada!',
        `Sua consulta foi marcada para ${formatDate(selectedDate)} às ${selectedTime}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error || 'Não foi possível agendar a consulta. Tente novamente.';
      Alert.alert('Erro', errMsg);
    },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${d} de ${months[parseInt(m) - 1]}`;
  };

  const canBook = selectedDate && selectedTime && appointmentType && professionalId;

  const markedDates: Record<string, object> = {};
  if (selectedDate) {
    markedDates[selectedDate] = { selected: true, selectedColor: colors.accentGreen };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Agendar consulta</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione a data</Text>
          <View style={styles.calendarWrapper}>
            <Calendar
              current={today}
              minDate={today}
              maxDate={maxDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setSelectedTime('');
              }}
              markedDates={markedDates}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: colors.surface,
                selectedDayBackgroundColor: colors.accentGreen,
                selectedDayTextColor: '#000',
                todayTextColor: colors.accentGreen,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textMuted,
                arrowColor: colors.accentGreen,
                monthTextColor: colors.textPrimary,
                textDayFontWeight: '600',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 15,
                dotColor: colors.accentGreen,
              }}
            />
          </View>
        </View>

        {/* Time slots */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={15} color={colors.accentGreen} />
              <Text style={styles.sectionTitle}>
                Horários — {formatDate(selectedDate)}
              </Text>
            </View>

            {loadingSlots ? (
              <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.md }} />
            ) : !slotsData?.slots.length ? (
              <Text style={styles.noSlots}>Nenhum horário disponível nesta data.</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slotsData.slots.map((slot) => (
                  <TouchableOpacity
                    key={slot.time}
                    style={[
                      styles.slotChip,
                      !slot.available && styles.slotChipUnavailable,
                      selectedTime === slot.time && styles.slotChipSelected,
                    ]}
                    onPress={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.slotText,
                      !slot.available && styles.slotTextUnavailable,
                      selectedTime === slot.time && styles.slotTextSelected,
                    ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Appointment type */}
        {selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de consulta</Text>
            <View style={styles.typeRow}>
              {APPOINTMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, appointmentType === t.key && styles.typeCardActive]}
                  onPress={() => setAppointmentType(t.key)}
                  activeOpacity={0.8}
                >
                  {t.icon}
                  <Text style={[styles.typeLabel, appointmentType === t.key && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                  {appointmentType === t.key && (
                    <View style={styles.typeCheck}>
                      <Check size={12} color="#000" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex: Dúvidas sobre minha dieta, atualização de peso..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Summary & confirm */}
        {canBook && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Data</Text>
              <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Horário</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tipo</Text>
              <Text style={styles.summaryValue}>
                {APPOINTMENT_TYPES.find((t) => t.key === appointmentType)?.label}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, bookMutation.isPending && styles.confirmBtnDisabled]}
              onPress={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
              activeOpacity={0.85}
            >
              {bookMutation.isPending
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.confirmBtnText}>Confirmar agendamento</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  title: { ...typography.h3, color: colors.textPrimary },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },

  calendarWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  noSlots: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  slotChipUnavailable: { opacity: 0.35 },
  slotChipSelected: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  slotText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  slotTextUnavailable: { color: colors.textMuted },
  slotTextSelected: { color: '#000' },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  typeCardActive: { borderColor: colors.accentGreen },
  typeLabel: { ...typography.label, color: colors.textSecondary, flex: 1 },
  typeLabelActive: { color: colors.textPrimary },
  typeCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentGreenDim,
    gap: spacing.sm,
  },
  summaryTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.bodySmall, color: colors.textSecondary },
  summaryValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
