import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar, Video, MessageCircle, User, Plus, ClipboardList } from 'lucide-react-native';
import api from '../../src/api/client';
import ScreenHeader from '../../src/components/ScreenHeader';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

interface Appointment {
  id: number;
  date: string;
  time: string;
  nutritionist: string;
  type: 'video' | 'presencial';
  status: 'agendada' | 'realizada' | 'cancelada';
  channel_name?: string;
  agora_token?: string;
}

interface Professional {
  id: number;
  name: string;
  email: string;
  role: 'nutritionist' | 'trainer';
  type: 'nutritionist' | 'trainer';
}

interface ProfessionalFeedback {
  id: number;
  content: string;
  type: string;
  professional_id: number;
  professional_name: string;
  created_at: string;
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const statusColors: Record<string, string> = {
    agendada: colors.accentBlue,
    realizada: colors.accentGreen,
    cancelada: colors.accentRed,
  };

  const canJoin =
    appt.status === 'agendada' && appt.type === 'video' && !!appt.channel_name;

  const handleCardPress = () => {
    const statusLabel = appt.status === 'agendada' ? 'Agendada' : appt.status === 'realizada' ? 'Realizada' : 'Cancelada';
    
    let buttons = [{ text: 'Fechar', style: 'cancel' as const }];
    if (appt.status === 'agendada') {
      buttons.push({
        text: 'Iniciar Chamada',
        onPress: () => {
          const url = `https://nutrir.online/video-call.html?room=${appt.channel_name}`;
          Linking.openURL(url).catch((err) => {
            Alert.alert('Erro', 'Não foi possível abrir o link da chamada de vídeo.');
            console.error(err);
          });
        }
      });
    }

    Alert.alert(
      'Detalhes da Consulta',
      `Profissional: ${appt.nutritionist}\nData: ${appt.date}\nHorário: ${appt.time}\nStatus: ${statusLabel}\nTipo: Vídeo chamada`,
      buttons
    );
  };

  return (
    <View style={styles.apptCard}>
      <TouchableOpacity
        style={styles.apptPressable}
        activeOpacity={0.7}
        onPress={handleCardPress}
      >
        <View style={styles.apptLeft}>
          <Calendar size={18} color={colors.accentGreen} />
        </View>
        <View style={styles.apptBody}>
          <Text style={styles.apptNutri}>{appt.nutritionist}</Text>
          <Text style={styles.apptDate}>{appt.date} às {appt.time}</Text>
          <View style={styles.apptFooter}>
            <Text style={[styles.apptStatus, { color: statusColors[appt.status] }]}>
              {appt.status}
            </Text>
            {appt.type === 'video' && (
              <Video size={14} color={colors.textMuted} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      {canJoin && (
        <TouchableOpacity
          style={styles.joinBtn}
          activeOpacity={0.8}
          onPress={() => {
            const url = `https://nutrir.online/video-call.html?room=${appt.channel_name}`;
            Linking.openURL(url).catch((err) => {
              Alert.alert('Erro', 'Não foi possível abrir o link da chamada de vídeo.');
              console.error(err);
            });
          }}
        >
          <Video size={16} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfissionalScreen() {
  const router = useRouter();

  // Consulta real de consultas do usuário
  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => api.get('/user/appointments').then((r) => {
      if (!Array.isArray(r.data)) return [];
      return r.data.map((a: any) => {
        // Formatar data no formato brasileiro
        let dateFormatted = '';
        try {
          const dateObj = new Date(a.appointment_date);
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const year = dateObj.getUTCFullYear();
          dateFormatted = `${day}/${month}/${year}`;
        } catch (_) {
          dateFormatted = a.appointment_date;
        }

        // Formatar intervalo de tempo
        const startTime = (a.start_time || '').substring(0, 5);
        const endTime = (a.end_time || '').substring(0, 5);
        const timeFormatted = `${startTime} - ${endTime}`;

        // Mapear status: scheduled -> agendada, cancelled -> cancelada, completed -> realizada
        let statusMapped: 'agendada' | 'realizada' | 'cancelada' = 'agendada';
        if (a.status === 'cancelled') statusMapped = 'cancelada';
        else if (a.status === 'completed') statusMapped = 'realizada';

        // Extrair roomName a partir do link do Jitsi
        let roomName = '';
        try {
          if (a.video_link) {
            const urlObj = new URL(a.video_link);
            roomName = urlObj.pathname.substring(1).split('#')[0].split('?')[0];
          }
        } catch (e) {
          if (a.video_link) {
            roomName = a.video_link.replace('https://meet.jit.si/', '').split('#')[0].split('?')[0];
          }
        }

        return {
          id: a.id,
          date: dateFormatted,
          time: timeFormatted,
          nutritionist: a.professional_name || 'Profissional',
          type: 'video',
          status: statusMapped,
          channel_name: roomName,
          agora_token: a.video_link,
        };
      });
    }),
  });

  // Consulta real de profissionais vinculados
  const { data: professionals, isLoading: loadingPros } = useQuery<Professional[]>({
    queryKey: ['linked-professionals'],
    queryFn: () => api.get('/user/linked-professionals').then((r) => r.data),
  });

  // Consulta real de orientações e feedbacks
  const { data: feedbacks, isLoading: loadingFeedbacks } = useQuery<ProfessionalFeedback[]>({
    queryKey: ['professional-feedbacks'],
    queryFn: () => api.get('/user/professional-feedbacks').then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Profissional" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Seção de Profissionais Vinculados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meus Profissionais</Text>
          {loadingPros ? (
            <ActivityIndicator color={colors.accentGreen} />
          ) : !professionals || professionals.length === 0 ? (
            <View style={styles.empty}>
              <User size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum profissional vinculado</Text>
            </View>
          ) : (
            <View style={styles.proList}>
              {professionals.map((prof) => (
                <View key={prof.id} style={styles.nutriCard}>
                  <View style={styles.nutriAvatar}>
                    <User size={28} color={prof.role === 'nutritionist' ? colors.accentPurple : colors.accentGreen} />
                  </View>
                  <View style={styles.nutriInfo}>
                    <Text style={styles.nutriName}>{prof.name}</Text>
                    <Text style={styles.nutriSpecialty}>
                      {prof.role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer'}
                    </Text>
                    <Text style={styles.nutriCrn}>{prof.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.messageBtn} activeOpacity={0.8}>
                    <MessageCircle size={20} color={colors.accentGreen} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Schedule button */}
        <TouchableOpacity
          style={styles.scheduleBtn}
          onPress={() => router.push('/schedule-appointment')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#000" />
          <Text style={styles.scheduleBtnText}>Agendar consulta</Text>
        </TouchableOpacity>

        {/* Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultas</Text>

          {loadingAppts ? (
            <ActivityIndicator color={colors.accentGreen} style={{ marginTop: spacing.lg }} />
          ) : !appointments || appointments.length === 0 ? (
            <View style={styles.empty}>
              <Calendar size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma consulta agendada</Text>
            </View>
          ) : (
            <View style={styles.apptList}>
              {appointments.map((a) => <AppointmentCard key={a.id} appt={a} />)}
            </View>
          )}
        </View>

        {/* Orientações clínicas do acompanhamento */}
        {feedbacks && feedbacks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={15} color={colors.accentPurple} />
              <Text style={styles.sectionTitle}>Meu Acompanhamento</Text>
            </View>
            <View style={styles.notesList}>
              {feedbacks.map((note) => {
                const dateFormatted = new Date(note.created_at).toLocaleDateString('pt-BR');
                return (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteAuthor}>{note.professional_name}</Text>
                      <Text style={styles.noteDate}>{dateFormatted}</Text>
                    </View>
                    <Text style={styles.noteContent}>{note.content}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },

  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },

  proList: { gap: spacing.sm },
  nutriCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutriAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriInfo: { flex: 1 },
  nutriName: { ...typography.label, color: colors.textPrimary, fontSize: 15 },
  nutriSpecialty: { ...typography.bodySmall, color: colors.textSecondary },
  nutriCrn: { ...typography.caption, color: colors.textMuted },
  messageBtn: { padding: spacing.sm },

  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  scheduleBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  apptList: { gap: spacing.sm },
  apptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apptPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  apptLeft: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apptBody: { flex: 1, gap: 2 },
  apptNutri: { ...typography.label, color: colors.textPrimary },
  apptDate: { ...typography.bodySmall, color: colors.textSecondary },
  apptFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  apptStatus: { ...typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  joinBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notesList: { gap: spacing.sm },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    gap: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPurple,
  },
  noteDate: { ...typography.caption, color: colors.textMuted },
  noteContent: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
});
