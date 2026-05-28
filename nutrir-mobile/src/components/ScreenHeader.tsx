import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useDrawerStore } from '../store/drawerStore';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
  title: string;
  right?: React.ReactNode;
  showMenu?: boolean;
}

export default function ScreenHeader({ title, right, showMenu = true }: Props) {
  const open = useDrawerStore((s) => s.open);

  return (
    <View style={styles.header}>
      {showMenu ? (
        <TouchableOpacity onPress={open} style={styles.menuBtn} hitSlop={10}>
          <Menu size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.right}>
        {right ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  menuBtn: { padding: 4 },
  placeholder: { width: 30 },
  title: { ...typography.h3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  right: { width: 30, alignItems: 'flex-end' },
});
