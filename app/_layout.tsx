import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { restoreSession, isLoading } = useAuthStore();

  useEffect(() => {
    restoreSession().finally(() => SplashScreen.hideAsync());
  }, []);

  if (isLoading) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(auth)/register" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="listing/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Atrás',
            headerTintColor: '#2563eb',
            headerTransparent: true,
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: true,
            headerBackTitle: 'Atrás',
            headerTintColor: '#2563eb',
          }}
        />
        <Stack.Screen
          name="profile/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Perfil',
            headerBackTitle: 'Atrás',
            headerTintColor: '#2563eb',
          }}
        />
        <Stack.Screen name="payment/result" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
