import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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

interface Nutritionist {
  id: number;
  name: string;
  specialty: string;
  crn: string;
}

interface NutritionistNote {
  id: number;
  content: string;
  created_at: string;
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const router = useRouter();
  const statusColors: Record<string, string> = {
    agendada: colors.accentBlue,
    realizada: colors.accentGreen,
    cancelada: colors.accentRed,
  };

  const canJoin =
    appt.status === 'agendada' && appt.type === 'video' && !!appt.channel_name;

  return (
    <View style={styles.apptCard}>
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
      {canJoin && (
        <TouchableOpacity
          style={styles.joinBtn}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/video-call',
              params: {
                channelName: appt.channel_name!,
                token: appt.agora_token ?? '',
                appointmentId: String(appt.id),
              },
            })
          }
        >
          <Video size={16} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfissionalScreen() {
  const router = useRouter();

  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments').then((r) => r.data),
  });

  const { data: nutritionist } = useQuery<Nutritionist>({
    queryKey: ['my-nutritionist'],
    queryFn: () => api.get('/user/nutritionist').then((r) => r.data),
  });

  const { data: notes } = useQuery<NutritionistNote[]>({
    queryKey: ['nutritionist-notes'],
    queryFn: () => api.get('/user/nutritionist-notes').then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Profissional" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Nutritionist Card */}
        {nutritionist && (
          <View style={styles.nutriCard}>
            <View style={styles.nutriAvatar}>
              <User size={28} color={colors.accentPurple} />
            </View>
            <View style={styles.nutriInfo}>
              <Text style={styles.nutriName}>{nutritionist.name}</Text>
              <Text style={styles.nutriSpecialty}>{nutritionist.specialty}</Text>
              <Text style={styles.nutriCrn}>CRN: {nutritionist.crn}</Text>
            </View>
            <TouchableOpacity style={styles.messageBtn} activeOpacity={0.8}>
              <MessageCircle size={20} color={colors.accentGreen} />
            </TouchableOpacity>
          </View>
        )}

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

        {/* Nutritionist notes / orientation */}
        {notes && notes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={15} color={colors.accentPurple} />
              <Text style={styles.sectionTitle}>Meu Acompanhamento</Text>
            </View>
            <View style={styles.notesList}>
              {notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <Text style={styles.noteDate}>{note.created_at}</Text>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </View>
              ))}
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

  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },

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
  noteDate: { ...typography.caption, color: colors.textMuted },
  noteContent: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
});
