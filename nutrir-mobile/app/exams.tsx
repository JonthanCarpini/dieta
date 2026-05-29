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
import * as FileSystem from 'expo-file-system';
import { ChevronLeft, Upload, FileText, Image as ImageIcon, Trash2, Calendar } from 'lucide-react-native';
import api from '../src/api/client';
import { colors, spacing, radius, typography } from '../src/constants/theme';

interface Exam {
  id: number;
  name: string;
  type: 'pdf' | 'image';
  size_kb: number;
  uploaded_at: string;
  url?: string;
  category?: string;
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
  const Icon = exam.type === 'pdf' ? FileText : ImageIcon;
  const iconColor = exam.type === 'pdf' ? colors.accentRed : colors.accentBlue;

  return (
    <View style={styles.examCard}>
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
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        hitSlop={8}
      >
        <Trash2 size={16} color={colors.accentRed} />
      </TouchableOpacity>
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
        Alert.alert('Erro no upload', 'Não foi possível enviar o arquivo.');
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

  examCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
