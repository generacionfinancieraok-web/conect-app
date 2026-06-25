import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { C } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [countdown, setCountdown] = useState(0);

  async function handleResend() {
    setLoading(true);
    try {
      await authApi.sendVerifyEmail();
      setSent(true);
      // Countdown 60 segundos para reenvío
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      Alert.alert('Email enviado', 'Revisá tu bandeja de entrada y la carpeta de spam.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Ionicons name="chevron-back" size={22} color={C.lavender} />
      </TouchableOpacity>

      <View style={s.content}>
        <Text style={s.icon}>✉️</Text>
        <Text style={s.title}>Verificá tu email</Text>
        <Text style={s.subtitle}>
          Te enviamos un enlace de verificación a{'\n'}
          <Text style={s.email}>{user?.email}</Text>
        </Text>
        <Text style={s.hint}>
          Hacé clic en el enlace del email para verificar tu cuenta. Si no lo ves, revisá spam.
        </Text>

        <TouchableOpacity
          onPress={handleResend}
          disabled={loading || countdown > 0}
          activeOpacity={0.85}
          style={{ width: '100%', marginTop: 8 }}
        >
          <LinearGradient
            colors={(loading || countdown > 0) ? ['#3B1F8C', '#3B1F8C'] : ['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.btn}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={s.btnText}>
                  {countdown > 0 ? `Reenviar en ${countdown}s` : sent ? 'Reenviar email' : 'Enviar email de verificación'}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={s.skipBtn}>
          <Text style={s.skipText}>Verificar después</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bgDeep },
  back:     { margin: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  content:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  icon:     { fontSize: 64, marginBottom: 8 },
  title:    { fontSize: 24, fontWeight: '800', color: C.lavender, textAlign: 'center' },
  subtitle: { fontSize: 15, color: C.lavenderMid, textAlign: 'center', lineHeight: 22 },
  email:    { color: C.lavender, fontWeight: '700' },
  hint:     { fontSize: 13, color: C.lavenderDim, textAlign: 'center', lineHeight: 20 },
  btn:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', width: '100%' },
  btnText:  { color: 'white', fontWeight: '700', fontSize: 16 },
  skipBtn:  { marginTop: 8, paddingVertical: 12 },
  skipText: { color: C.lavenderDim, fontSize: 14 },
});
