import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/constants/theme';
import AppDrawer from '../src/components/AppDrawer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGuard() {
  const { token, isReady } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isReady, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentGreen} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPrimary } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="scan-results" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="add-food" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="historico" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="jejum" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="recipe-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="perfil" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="exams" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="schedule-appointment" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="video-call" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGuard />
        <AppDrawer />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

