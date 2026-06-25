import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '@/lib/api';
import { C } from '@/constants/colors';

type Step = 'phone' | 'code';

export default function VerifyPhoneScreen() {
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('+54');
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRef = useRef<TextInput>(null);

  function startCountdown() {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendSms() {
    const trimmed = phone.trim();
    if (!trimmed.startsWith('+') || trimmed.length < 10) {
      Alert.alert('Error', 'Ingresá el número con código de país (ej: +5491122334455)');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendSmsCode(trimmed);
      setStep('code');
      startCountdown();
      setTimeout(() => codeRef.current?.focus(), 300);
      // En dev, mostrar el código en pantalla
      if (res.devCode) {
        Alert.alert('Dev Mode', `Código: ${res.devCode}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el SMS');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      Alert.alert('Error', 'El código tiene 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifySmsCode(code);
      Alert.alert('¡Listo!', 'Tu número de teléfono fue verificado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setCode('');
    setLoading(true);
    try {
      await authApi.sendSmsCode(phone.trim());
      startCountdown();
      Alert.alert('SMS reenviado', 'Revisá tu teléfono.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo reenviar el SMS');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.lavender} />
        </TouchableOpacity>

        <View style={s.content}>
          <Text style={s.icon}>{step === 'phone' ? '📱' : '🔑'}</Text>
          <Text style={s.title}>
            {step === 'phone' ? 'Verificar teléfono' : 'Ingresá el código'}
          </Text>
          <Text style={s.subtitle}>
            {step === 'phone'
              ? 'Ingresá tu número para recibir un SMS de verificación.'
              : `Te enviamos un código de 6 dígitos a ${phone}`
            }
          </Text>

          {step === 'phone' ? (
            <View style={{ width: '100%', gap: 16 }}>
              <View>
                <Text style={s.label}>Número de teléfono</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+5491122334455"
                  placeholderTextColor={C.lavenderDim}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                <Text style={s.hint}>Incluí el código de país (Argentina: +54)</Text>
              </View>

              <TouchableOpacity onPress={handleSendSms} disabled={loading} activeOpacity={0.85}>
                <LinearGradient
                  colors={loading ? ['#3B1F8C', '#3B1F8C'] : ['#6C3DE0', '#EC4899']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={s.btnText}>Enviar código SMS</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '100%', gap: 16 }}>
              <View>
                <Text style={s.label}>Código de verificación</Text>
                <TextInput
                  ref={codeRef}
                  style={[s.input, { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '800' }]}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={C.lavenderDim}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity onPress={handleVerifyCode} disabled={loading || code.length !== 6} activeOpacity={0.85}>
                <LinearGradient
                  colors={(loading || code.length !== 6) ? ['#3B1F8C', '#3B1F8C'] : ['#6C3DE0', '#EC4899']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.btn}
                >
                  {loading
                    ? <ActivityIndicator color="white" />
                    : <Text style={s.btnText}>Verificar</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || loading}
                style={s.resendBtn}
              >
                <Text style={[s.resendText, countdown > 0 && { color: C.lavenderDim }]}>
                  {countdown > 0 ? `Reenviar en ${countdown}s` : 'No recibí el código — Reenviar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('phone')} style={s.changeBtn}>
                <Text style={s.changeText}>Cambiar número</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bgDeep },
  back:       { margin: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  content:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  icon:       { fontSize: 56, marginBottom: 4 },
  title:      { fontSize: 24, fontWeight: '800', color: C.lavender, textAlign: 'center' },
  subtitle:   { fontSize: 14, color: C.lavenderMid, textAlign: 'center', lineHeight: 20 },
  label:      { fontSize: 13, fontWeight: '600', color: C.lavender, marginBottom: 8 },
  input:      {
    borderWidth: 1.5, borderColor: '#2D2060', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: 'white', backgroundColor: '#1E1A35',
  },
  hint:       { fontSize: 12, color: C.lavenderDim, marginTop: 6 },
  btn:        { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText:    { color: 'white', fontWeight: '700', fontSize: 16 },
  resendBtn:  { paddingVertical: 10, alignItems: 'center' },
  resendText: { color: C.primary, fontSize: 14, fontWeight: '600' },
  changeBtn:  { paddingVertical: 8, alignItems: 'center' },
  changeText: { color: C.lavenderDim, fontSize: 13 },
});
