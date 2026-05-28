import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  History,
  Timer,
  FileText,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useDrawerStore } from '../store/drawerStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, radius, typography } from '../constants/theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

interface DrawerItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  roles?: string[];
}

const ITEMS: DrawerItem[] = [
  { icon: <User size={20} color={colors.accentGreen} />, label: 'Meu Perfil', path: '/perfil' },
  { icon: <History size={20} color={colors.accentBlue} />, label: 'Histórico', path: '/historico' },
  { icon: <Timer size={20} color={colors.accentOrange} />, label: 'Jejum Intermitente', path: '/jejum' },
  { icon: <FileText size={20} color={colors.accentPurple} />, label: 'Meus Exames', path: '/exams' },
  {
    icon: <ShieldCheck size={20} color={colors.accentYellow} />,
    label: 'Painel Admin',
    path: '/admin',
    roles: ['admin', 'nutricionista'],
  },
];

const PLAN_LABELS: Record<string, string> = {
  free: 'Plano Free',
  basic: 'Plano Básico',
  premium: 'Plano Premium',
  pro: 'Plano Pro',
};

export default function AppDrawer() {
  const { isOpen, close } = useDrawerStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen]);

  const navigate = (path: string) => {
    close();
    setTimeout(() => router.push(path as never), 220);
  };

  const handleLogout = async () => {
    close();
    setTimeout(async () => {
      await logout();
      router.replace('/(auth)/login');
    }, 220);
  };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?';

  const plan = user?.plan ? (PLAN_LABELS[user.plan] ?? user.plan) : 'Plano Free';

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        </Animated.View>

        {/* Panel */}
        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name ?? 'Usuário'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{plan}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Nav items */}
          <View style={styles.nav}>
            {ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role ?? '')).map((item) => (
              <TouchableOpacity
                key={item.path}
                style={styles.navItem}
                onPress={() => navigate(item.path)}
                activeOpacity={0.75}
              >
                <View style={styles.navIcon}>{item.icon}</View>
                <Text style={styles.navLabel}>{item.label}</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <LogOut size={18} color={colors.accentRed} />
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  panel: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: colors.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },

  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#000' },
  userInfo: { flex: 1, gap: 2 },
  userName: { ...typography.label, color: colors.textPrimary, fontSize: 15 },
  userEmail: { ...typography.caption, color: colors.textMuted },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  planText: { fontSize: 10, fontWeight: '700', color: colors.accentGreen },
  closeBtn: { padding: 4 },

  nav: { flex: 1, paddingVertical: spacing.md },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  navIcon: { width: 24, alignItems: 'center' },
  navLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },

  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  logoutText: { ...typography.body, color: colors.accentRed, fontWeight: '600' },
});
