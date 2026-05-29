import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { colors, spacing, radius, typography } from '../src/constants/theme';
import { AlertCircle, ChevronLeft } from 'lucide-react-native';

export default function VideoCallScreen() {
  const router = useRouter();
  const { channelName } = useLocalSearchParams<{ channelName: string }>();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cameraStatus = await Camera.requestCameraPermissionsAsync();
        const microphoneStatus = await Camera.requestMicrophonePermissionsAsync();
        setHasPermission(
          cameraStatus.status === 'granted' && microphoneStatus.status === 'granted'
        );
      } catch (err) {
        console.error('Erro ao solicitar permissões de mídia:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles.fullscreen}>
        <ActivityIndicator size="large" color={colors.accentGreen} />
        <Text style={styles.text}>Solicitando permissão de câmera e microfone...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.fallbackSafe}>
        <View style={styles.fallbackContent}>
          <AlertCircle size={48} color={colors.accentRed} />
          <Text style={styles.fallbackTitle}>Sem permissão de mídia</Text>
          <Text style={styles.fallbackBody}>
            Para participar da consulta por vídeo, você precisa permitir o acesso à câmera e ao microfone nas configurações do seu celular.
          </Text>
          <TouchableOpacity style={styles.fallbackBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.fallbackBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const videoUrl = `https://nutrir.online/video-call.html?room=${channelName}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>Sair da Chamada</Text>
        </TouchableOpacity>
      </View>
      <WebView
        source={{ uri: videoUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        geolocationEnabled={false}
        androidHardwareAccelerationDisabled={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        onPermissionRequest={(event) => {
          event.grant(event.resources);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'close') {
              router.back();
            }
          } catch (e) {
            console.error('Erro ao processar mensagem do WebView:', e);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 50,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  fullscreen: {
    flex: 1,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: { ...typography.body, color: colors.textSecondary },
  
  // Fallback styles
  fallbackSafe: { flex: 1, backgroundColor: colors.bgPrimary },
  fallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  fallbackTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  fallbackBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  fallbackBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  fallbackBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
