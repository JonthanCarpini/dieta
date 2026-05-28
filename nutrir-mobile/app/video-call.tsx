import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertCircle } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../src/constants/theme';

// Agora is only available in native builds — guard the import
let RtcEngine: any = null;
let RtcSurfaceView: any = null;
let VideoSourceType: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const agora = require('react-native-agora');
    RtcEngine = agora.createAgoraRtcEngine;
    RtcSurfaceView = agora.RtcSurfaceView;
    VideoSourceType = agora.VideoSourceType;
    ChannelProfileType = agora.ChannelProfileType;
    ClientRoleType = agora.ClientRoleType;
  } catch (_) {
    // native module not linked (e.g. dev client without rebuild)
  }
}

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

type CallStatus = 'connecting' | 'connected' | 'ended' | 'error';

export default function VideoCallScreen() {
  const router = useRouter();
  const { channelName, token: agoraToken, appointmentId } = useLocalSearchParams<{
    channelName: string;
    token: string;
    appointmentId: string;
  }>();

  const engineRef = useRef<any>(null);
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const endCall = useCallback(() => {
    try {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    } catch (_) {}
    engineRef.current = null;
    setStatus('ended');
    router.back();
  }, [router]);

  useEffect(() => {
    if (isExpoGo || !RtcEngine) return;

    const engine = RtcEngine();
    engineRef.current = engine;

    engine.initialize({
      appId: APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    engine.registerEventHandler({
      onJoinChannelSuccess: () => setStatus('connected'),
      onUserJoined: (_connection: any, uid: number) => setRemoteUid(uid),
      onUserOffline: (_connection: any, uid: number) => {
        if (uid === remoteUid) setRemoteUid(null);
      },
      onError: () => setStatus('error'),
    });

    engine.enableVideo();
    engine.startPreview();

    engine.joinChannel(agoraToken ?? null, channelName ?? '', 0, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });

    return () => {
      engine.leaveChannel();
      engine.unregisterEventHandler({});
      engine.release();
      engineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = () => {
    engineRef.current?.muteLocalAudioStream(!micMuted);
    setMicMuted((v) => !v);
  };

  const toggleCam = () => {
    engineRef.current?.muteLocalVideoStream(!camOff);
    setCamOff((v) => !v);
  };

  // ── Expo Go / no-native fallback ──────────────────────────────────────────
  if (isExpoGo || !RtcEngine) {
    return (
      <SafeAreaView style={styles.fallbackSafe}>
        <View style={styles.fallbackContent}>
          <AlertCircle size={48} color={colors.accentYellow} />
          <Text style={styles.fallbackTitle}>Vídeo chamada indisponível</Text>
          <Text style={styles.fallbackBody}>
            As videochamadas nativas requerem um build de produção (EAS Build).
            No Expo Go este recurso não está disponível.
          </Text>
          <TouchableOpacity style={styles.fallbackBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.fallbackBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Connecting ────────────────────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <View style={styles.fullscreen}>
        <ActivityIndicator size="large" color={colors.accentGreen} />
        <Text style={styles.connectingText}>Conectando à consulta…</Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <View style={styles.fullscreen}>
        <AlertCircle size={40} color={colors.accentRed} />
        <Text style={styles.errorText}>Não foi possível conectar.</Text>
        <TouchableOpacity style={styles.endBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.endBtnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Active call ───────────────────────────────────────────────────────────
  return (
    <View style={styles.fullscreen}>
      {/* Remote video (full screen) */}
      {remoteUid !== null ? (
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.waitingOverlay]}>
          <ActivityIndicator color={colors.accentGreen} />
          <Text style={styles.waitingText}>Aguardando nutricionista…</Text>
        </View>
      )}

      {/* Local video PiP */}
      {!camOff && (
        <View style={styles.pip}>
          <RtcSurfaceView
            style={styles.pipVideo}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
          />
        </View>
      )}

      {/* Controls */}
      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <TouchableOpacity
          style={[styles.controlBtn, micMuted && styles.controlBtnActive]}
          onPress={toggleMic}
          activeOpacity={0.8}
        >
          {micMuted
            ? <MicOff size={22} color="#fff" />
            : <Mic size={22} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.hangupBtn} onPress={endCall} activeOpacity={0.85}>
          <PhoneOff size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, camOff && styles.controlBtnActive]}
          onPress={toggleCam}
          activeOpacity={0.8}
        >
          {camOff
            ? <VideoOff size={22} color="#fff" />
            : <Video size={22} color="#fff" />}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const CONTROL_SIZE = 56;

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectingText: { ...typography.body, color: '#fff', marginTop: spacing.md },
  errorText: { ...typography.body, color: colors.accentRed, marginTop: spacing.md },

  endBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accentRed,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  waitingOverlay: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  waitingText: { ...typography.body, color: colors.textSecondary },

  pip: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    width: 100,
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pipVideo: { flex: 1 },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  controlBtn: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.35)' },

  hangupBtn: {
    width: CONTROL_SIZE + 12,
    height: CONTROL_SIZE + 12,
    borderRadius: (CONTROL_SIZE + 12) / 2,
    backgroundColor: colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
