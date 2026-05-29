import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ChevronLeft, Upload, FileText, Image as ImageIcon, Trash2, Calendar } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface ExamMarker {
  id: number;
  marker_name: string;
  marker_value: string;
  numeric_value?: number;
  unit?: string;
  reference_range?: string;
  status: 'normal' | 'high' | 'low' | 'abnormal';
}

interface Exam {
  id: number;
  name: string;
  type: 'pdf' | 'image';
  size_kb: number;
  uploaded_at: string;
  url?: string;
  category?: string;
  notes?: string;
  markers?: ExamMarker[];
}

const CATEGORIES = [
  'Hemograma',
  'Bioquímica',
  'Hormônios',
  'Urina',
  'Imagem',
  'Outro',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function ExamCard({ exam, onDelete }: { exam: Exam; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = exam.type === 'pdf' ? FileText : ImageIcon;
  const iconColor = exam.type === 'pdf' ? colors.accentRed : colors.accentBlue;

  return (
    <View style={styles.examCardContainer}>
      <TouchableOpacity 
        style={styles.examCard} 
        onPress={() => exam.markers && exam.markers.length > 0 && setExpanded(!expanded)}
        activeOpacity={exam.markers && exam.markers.length > 0 ? 0.7 : 1}
      >
        <View style={[styles.examIcon, { backgroundColor: `${iconColor}15` }]}>
          <Icon size={22} color={iconColor} />
        </View>
        <View style={styles.examBody}>
          <Text style={styles.examName} numberOfLines={1}>{exam.name}</Text>
          <View style={styles.examMeta}>
            {exam.category && <Text style={styles.examCategory}>{exam.category}</Text>}
            <View style={styles.examMetaRow}>
              <Calendar size={11} color={colors.textMuted} />
              <Text style={styles.examDate}>{formatDate(exam.uploaded_at)}</Text>
              <Text style={styles.examSize}>{formatSize(exam.size_kb)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rightActions}>
          {exam.markers && exam.markers.length > 0 && (
            <ChevronLeft 
              size={18} 
              color={colors.textMuted} 
              style={{ transform: [{ rotate: expanded ? '90deg' : '270deg' }], marginRight: 8 }} 
            />
          )}
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={8}
          >
            <Trash2 size={16} color={colors.accentRed} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {expanded && exam.markers && exam.markers.length > 0 && (
        <View style={styles.markersExpanded}>
          <Text style={styles.markersTitle}>Biomarcadores Extraídos:</Text>
          <View style={styles.markersList}>
            {exam.markers.map((m) => {
              let statusColor = '#a8a8a8';
              let statusBg = 'rgba(255,255,255,0.05)';
              if (m.status === 'high' || m.status === 'abnormal') {
                statusColor = '#ef4444';
                statusBg = 'rgba(239,68,68,0.12)';
              } else if (m.status === 'low') {
                statusColor = '#3b82f6';
                statusBg = 'rgba(59,130,246,0.12)';
              } else if (m.status === 'normal') {
                statusColor = '#10b981';
                statusBg = 'rgba(16,185,129,0.12)';
              }

              return (
                <View key={m.id} style={[styles.markerItem, { backgroundColor: statusBg, borderColor: `${statusColor}20` }]}>
                  <View style={styles.markerRow}>
                    <Text style={styles.markerName}>{m.marker_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}30` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {m.status === 'low' ? 'Baixo' : m.status === 'high' ? 'Alto' : m.status === 'abnormal' ? 'Alterado' : m.status === 'normal' ? 'Normal' : m.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.markerValueRow}>
                    <Text style={styles.markerValue}>{m.marker_value}</Text>
                    {m.unit && <Text style={styles.markerUnit}> {m.unit}</Text>}
                  </View>
                  {m.reference_range && (
                    <Text style={styles.markerRef}>Ref: {m.reference_range}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export default function ExamsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('Outro');

  const { data: exams, isLoading, refetch } = useQuery<Exam[]>({
    queryKey: ['exams'],
    queryFn: () => api.get('/user/exams').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/user/exams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
    onError: () => Alert.alert('Erro', 'Não foi possível excluir o exame.'),
  });

  const handleDelete = (exam: Exam) => {
    Alert.alert(
      'Excluir exame',
      `Deseja excluir "${exam.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(exam.id) },
      ]
    );
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const sizeKb = asset.size ? Math.round(asset.size / 1024) : 0;

      if (sizeKb > 10_240) {
        Alert.alert('Arquivo muito grande', 'O arquivo deve ter no máximo 10 MB.');
        return;
      }

      setUploading(true);

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileType = asset.mimeType ?? 'application/octet-stream';
      const examType: 'pdf' | 'image' = fileType.startsWith('image/') ? 'image' : 'pdf';

      await api.post('/user/exams', {
        name: asset.name,
        type: examType,
        category,
        size_kb: sizeKb,
        base64,
        mime_type: fileType,
      });

      qc.invalidateQueries({ queryKey: ['exams'] });
      Alert.alert('Upload realizado!', `"${asset.name}" foi enviado com sucesso.`);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message !== 'canceled') {
        Alert.alert('Erro no upload', `Não foi possível enviar o arquivo. Detalhes: ${err.message || String(e)}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Exames</Text>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          activeOpacity={0.85}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#000" />
            : <><Upload size={14} color="#000" /><Text style={styles.uploadBtnText}>Upload</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Category picker */}
      <View style={styles.categorySection}>
        <Text style={styles.categoryLabel}>Categoria do próximo upload:</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} size="large" />
        </View>
      ) : (
        <FlatList
          data={exams ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ExamCard exam={item} onDelete={() => handleDelete(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum exame enviado</Text>
              <Text style={styles.emptyText}>
                Envie seus exames em PDF ou imagem para compartilhar com seu nutricionista.
              </Text>
              <TouchableOpacity
                style={styles.emptyUploadBtn}
                onPress={handleUpload}
                disabled={uploading}
                activeOpacity={0.85}
              >
                <Upload size={16} color={colors.accentGreen} />
                <Text style={styles.emptyUploadText}>Enviar primeiro exame</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  title: { ...typography.h3, color: colors.textPrimary, flex: 1, marginLeft: spacing.sm },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentGreen,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  categorySection: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 6 },
  categoryLabel: { ...typography.caption, color: colors.textMuted },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  catChipActive: { backgroundColor: colors.accentPurple, borderColor: colors.accentPurple },
  catText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  catTextActive: { color: '#fff' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  examCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  examCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markersExpanded: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markersTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  markersList: {
    gap: 8,
  },
  markerItem: {
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  markerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  markerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  markerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  markerUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  markerRef: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  examIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  examBody: { flex: 1, gap: 4 },
  examName: { ...typography.label, color: colors.textPrimary, fontSize: 14 },
  examMeta: { gap: 2 },
  examCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  examMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  examDate: { ...typography.caption, color: colors.textMuted },
  examSize: { ...typography.caption, color: colors.textMuted },
  deleteBtn: { padding: 6 },

  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.accentGreen,
    marginTop: spacing.sm,
  },
  emptyUploadText: { color: colors.accentGreen, fontWeight: '700', fontSize: 14 },
});
