import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length > 0) {
      formatted += `(${digits.slice(0, 2)}`;
    }
    if (digits.length > 2) {
      formatted += `)${digits.slice(2, 7)}`;
    }
    if (digits.length > 7) {
      formatted += `-${digits.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handlePickAvatar = async () => {
    try {
      setPickingImage(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para selecionar uma foto de perfil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setAvatar(result.assets[0].base64);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword || !phone.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    const phoneRegex = /^\(\d{2}\)\d{5}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      setError('Telefone deve ter o formato (xx)xxxxx-xxxx');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        profile_image: avatar,
      });
      await login(data.token, data.user);
      router.replace('/onboarding' as never);   // anamnese obrigatória antes do app
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Junte-se ao Nutrir gratuitamente</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Seletor de Foto de Perfil */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={pickingImage}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              {pickingImage ? (
                <ActivityIndicator color={colors.accentGreen} />
              ) : avatar ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${avatar}` }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>+</Text>
              )}
            </View>
            <View style={styles.avatarEdit}>
              <Camera size={14} color="#000" />
            </View>
          </TouchableOpacity>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="(xx)xxxxx-xxxx"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={14}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>Criar conta</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>
              Já tem conta?{' '}
              <Text style={styles.linkAccent}>Faça login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  backBtn: { marginBottom: spacing.sm },
  backText: { color: colors.accentGreen, fontSize: 15, fontWeight: '600' },
  header: { marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  avatarContainer: { alignSelf: 'center', marginBottom: spacing.md, position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 32, color: colors.textMuted, fontWeight: '300' },
  avatarImage: { width: 90, height: 90, borderRadius: radius.full },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgPrimary,
  },
  form: { gap: spacing.md },
  field: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  link: { alignItems: 'center', marginTop: spacing.sm },
  linkText: { ...typography.body, color: colors.textSecondary },
  linkAccent: { color: colors.accentGreen, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#2D1A1A',
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentRed,
  },
  errorText: { color: colors.accentRed, fontSize: 14 },
});
