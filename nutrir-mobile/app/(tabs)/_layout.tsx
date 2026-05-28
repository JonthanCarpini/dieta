import { Tabs } from 'expo-router';
import { BookOpen, ChefHat, UserCheck, Activity } from 'lucide-react-native';
import { colors } from '../../src/constants/theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        safeAreaInsets: {
          bottom: Platform.OS === 'android' ? 48 : (isIOS ? insets.bottom : 0),
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          // Removemos height e paddingBottom manuais para deixar o React Navigation gerenciar via safeAreaInsets
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Diário',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="receitas"
        options={{
          title: 'Receitas',
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profissional"
        options={{
          title: 'Pro',
          tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clinico"
        options={{
          title: 'Clínico',
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
