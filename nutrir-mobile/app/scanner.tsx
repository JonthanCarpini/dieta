import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { X, Zap, FlipHorizontal, Terminal, Image as ImageIcon } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { colors, radius, typography } from '../src/constants/theme';

const API_BASE = 'https://nutrir.online/api';

interface LogEntry { ts: string; ok: boolean; msg: string }

function nowTs() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [capturing, setCapturing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logScrollRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const addLog = useCallback((msg: string, ok = true) => {
    const entry: LogEntry = { ts: nowTs(), ok, msg };
    setLogs((prev) => [...prev, entry]);
    console.log(`[SCANNER ${ok ? 'OK' : 'ERR'}] ${msg}`);
  }, []);

  useEffect(() => {
    if (logs.length > 0) setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [logs]);

  // ── Core analysis pipeline ──────────────────────────────────
  const analyzeUri = useCallback(async (rawUri: string) => {
    setCapturing(true);
    setLogs([]);
    setShowLogs(true);

    try {
      // STEP 2 — comprimir
      addLog('2. Comprimindo imagem (800px, JPEG 70%)…');
      let compressed: { uri: string };
      try {
        compressed = await manipulateAsync(rawUri, [{ resize: { width: 800 } }], {
          format: SaveFormat.JPEG, compress: 0.7,
        });
        addLog(`2. Compressão OK — ${compressed.uri.slice(0, 55)}…`);
      } catch (e) {
        addLog(`2. FALHA compressão: ${(e as Error).message}`, false);
        throw e;
      }

      // STEP 3 — info do arquivo (sem ler em memória)
      addLog('3. Verificando arquivo no disco…');
      let fileSizeKB = 0;
      try {
        const info = await FileSystem.getInfoAsync(compressed.uri);
        fileSizeKB = info.exists && 'size' in info && typeof info.size === 'number' ? Math.round(info.size / 1024) : 0;
        addLog(`3. Arquivo OK — ${fileSizeKB} KB no disco`);
      } catch (e) {
        addLog(`3. AVISO getInfoAsync: ${(e as Error).message}`);
      }

      // STEP 4 — upload nativo via OkHttp (não passa pelo bridge JS)
      // FileSystem.uploadAsync usa o stack de networking nativo do Android,
      // evitando o crash do RN Networking module com bodies grandes via XHR/fetch.
      addLog(`4. Upload nativo (OkHttp) → /ai/analyze-food-binary…`);
      let responseData: unknown;
      let httpStatus = 0;
      let responseText = '';
      try {
        const t0 = Date.now();
        const result = await FileSystem.uploadAsync(
          `${API_BASE}/ai/analyze-food-binary`,
          compressed.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'Content-Type': 'image/jpeg',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        httpStatus = result.status;
        responseText = result.body ?? '';
        addLog(`4.1. Upload completo — HTTP ${httpStatus} em ${Date.now() - t0}ms`);
        addLog(`4.2. Body recebido — ${Math.round(responseText.length / 1024)} KB`);
      } catch (e) {
        addLog(`4. FALHA upload: ${(e as Error).message}`, false);
        throw e;
      }

      // STEP 5 — verificar status
      if (httpStatus < 200 || httpStatus >= 300) {
        const preview = responseText.slice(0, 200);
        addLog(`5. HTTP ${httpStatus} — body: ${preview}`, false);
        let errMsg = `HTTP ${httpStatus}`;
        try { errMsg = (JSON.parse(responseText) as { error?: string }).error ?? errMsg; } catch {}
        throw new Error(errMsg);
      }

      // STEP 6 — parsear resposta
      addLog(`6. Preview resposta: ${responseText.slice(0, 90).replace(/\n/g, ' ')}…`);
      try {
        responseData = JSON.parse(responseText);
        const items = (responseData as { items?: unknown[] }).items;
        addLog(`6. JSON parseado — ${items?.length ?? 0} itens detectados`);
      } catch (e) {
        addLog(`6. FALHA JSON.parse: ${(e as Error).message}`, false);
        addLog(`6. Body completo: ${responseText.slice(0, 300)}`, false);
        throw e;
      }

      // STEP 7 — navegar
      addLog('7. Navegando para resultados…');
      router.replace({ pathname: '/scan-results', params: { results: JSON.stringify(responseData) } });

    } catch (e: unknown) {
      const err = e as Error;
      const msg = err.message ?? 'Erro desconhecido';
      addLog(`✖ Falha final: ${msg}`, false);
      Alert.alert(
        'Erro ao analisar',
        msg,
        [{ text: 'Ver logs', onPress: () => setShowLogs(true) }, { text: 'OK' }]
      );
    } finally {
      setCapturing(false);
    }
  }, [token, router, addLog]);

  // ── Câmera ──────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;

    addLog('1. Capturando foto…');
    let photo: { uri: string } | undefined;
    try {
      photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: true }) ?? undefined;
      if (!photo?.uri) throw new Error('uri da foto é null');
      addLog(`1. Foto OK — ${photo.uri.slice(0, 55)}…`);
    } catch (e) {
      setShowLogs(true);
      addLog(`1. FALHA câmera: ${(e as Error).message}`, false);
      return;
    }

    await analyzeUri(photo.uri);
  }, [capturing, analyzeUri, addLog]);

  // ── Galeria ─────────────────────────────────────────────────
  const handleGallery = useCallback(async () => {
    if (capturing) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para usar essa função.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    addLog(`1. Imagem da galeria — ${result.assets[0].uri.slice(0, 55)}…`);
    await analyzeUri(result.assets[0].uri);
  }, [capturing, analyzeUri, addLog]);

  // ── Render ──────────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Text style={styles.permissionTitle}>Câmera necessária</Text>
        <Text style={styles.permissionText}>Precisamos de acesso à câmera para analisar seus alimentos.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>Permitir acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturing ? (
        // TELA DE CARREGAMENTO / ANÁLISE (Sem CameraView para liberar hardware e memória)
        <View style={styles.loadingContainer}>
          {/* Header minimalista */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Análise Nutricional</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Conteúdo Central */}
          <View style={styles.loadingContentWrapper}>
            <ActivityIndicator color={colors.accentGreen} size="large" />
            <Text style={styles.loadingText}>Analisando com IA…</Text>
            <Text style={styles.loadingSubtext}>O Gemini Vision está estimando pesos e macros da refeição.</Text>
            <Text style={styles.loadingTimeHint}>Pode levar até 20 segundos</Text>
          </View>

          {/* Log panel */}
          {showLogs && (
            <View style={[styles.logPanel, { bottom: 100 }]}>
              <View style={styles.logHeader}>
                <Terminal size={13} color={colors.accentGreen} />
                <Text style={styles.logTitle}>Debug Scanner</Text>
                <TouchableOpacity onPress={() => setShowLogs(false)} hitSlop={8}>
                  <Text style={styles.logClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={logScrollRef} style={styles.logScroll} contentContainerStyle={styles.logContent} showsVerticalScrollIndicator={false}>
                {logs.length === 0 ? (
                  <Text style={styles.logEmpty}>Aguardando captura…</Text>
                ) : (
                  logs.map((l, i) => (
                    <Text key={i} style={[styles.logLine, !l.ok && styles.logLineErr]}>
                      <Text style={styles.logTs}>{l.ts} </Text>{l.msg}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Footer minimalista de progresso */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={() => setShowLogs((v) => !v)}
                activeOpacity={0.85}
              >
                <Terminal size={20} color={logs.some(l => !l.ok) ? '#ff6b6b' : '#fff'} />
              </TouchableOpacity>
            </View>

            {logs.length > 0 && (
              <Text style={[styles.analyzingText, { color: logs.some(l => !l.ok) ? '#ff6b6b' : colors.accentGreen, marginTop: 12 }]}>
                {logs.some(l => !l.ok) ? '✖ Erro — toque no terminal para ver' : `✓ ${logs[logs.length - 1]?.msg}`}
              </Text>
            )}
          </View>
        </View>
      ) : (
        // MODO CÂMERA ATIVA
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="picture">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scanner de Alimentos</Text>
            <TouchableOpacity
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              style={styles.iconBtn} hitSlop={12}
            >
              <FlipHorizontal size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderWrapper}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            {!showLogs && <Text style={styles.hint}>Aponte para o prato ou embalagem</Text>}
          </View>

          {/* Log panel */}
          {showLogs && (
            <View style={styles.logPanel}>
              <View style={styles.logHeader}>
                <Terminal size={13} color={colors.accentGreen} />
                <Text style={styles.logTitle}>Debug Scanner</Text>
                <TouchableOpacity onPress={() => setShowLogs(false)} hitSlop={8}>
                  <Text style={styles.logClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={logScrollRef} style={styles.logScroll} contentContainerStyle={styles.logContent} showsVerticalScrollIndicator={false}>
                {logs.length === 0 ? (
                  <Text style={styles.logEmpty}>Aguardando captura…</Text>
                ) : (
                  logs.map((l, i) => (
                    <Text key={i} style={[styles.logLine, !l.ok && styles.logLineErr]}>
                      <Text style={styles.logTs}>{l.ts} </Text>{l.msg}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              {/* Galeria */}
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={handleGallery}
                activeOpacity={0.85}
              >
                <ImageIcon size={22} color="#fff" />
              </TouchableOpacity>

              {/* Captura */}
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={handleCapture}
                activeOpacity={0.85}
              >
                <Zap size={28} color="#000" />
              </TouchableOpacity>

              {/* Logs toggle */}
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={() => setShowLogs((v) => !v)}
                activeOpacity={0.85}
              >
                <Terminal size={20} color={logs.some(l => !l.ok) ? '#ff6b6b' : '#fff'} />
              </TouchableOpacity>
            </View>

            {logs.length > 0 && (
              <Text style={[styles.analyzingText, { color: logs.some(l => !l.ok) ? '#ff6b6b' : colors.accentGreen }]}>
                {logs.some(l => !l.ok) ? '✖ Erro — toque no terminal para ver' : `✓ ${logs[logs.length - 1]?.msg}`}
              </Text>
            )}
          </View>
        </CameraView>
      )}
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitle: { ...typography.label, color: '#fff', fontSize: 16 },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },

  viewfinderWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  viewfinder: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: colors.accentGreen },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },

  logPanel: {
    position: 'absolute', bottom: 170, left: 12, right: 12, height: 220,
    backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,222,128,0.2)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  logTitle: { flex: 1, color: colors.accentGreen, fontSize: 11, fontWeight: '700' },
  logClose: { color: '#888', fontSize: 14, paddingHorizontal: 4 },
  logScroll: { flex: 1 },
  logContent: { padding: 10, gap: 3 },
  logEmpty: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  logLine: { color: '#a0f0b0', fontSize: 10, lineHeight: 16 },
  logLineErr: { color: '#ff6b6b' },
  logTs: { color: '#555', fontSize: 9 },

  footer: { paddingBottom: 48, alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 },
  captureBtn: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  galleryBtn: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  btnDisabled: { opacity: 0.4 },
  analyzingText: { color: '#fff', fontSize: 12, textAlign: 'center', paddingHorizontal: 16 },

  permissionBox: {
    flex: 1, backgroundColor: colors.bgPrimary,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  permissionTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  permissionText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: colors.accentGreen, borderRadius: radius.md,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  permissionBtnText: { fontWeight: '700', color: '#000', fontSize: 15 },
  cancelLink: { marginTop: 8 },
  cancelLinkText: { color: colors.textMuted, fontSize: 14 },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingTimeHint: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
