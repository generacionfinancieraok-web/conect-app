import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '@/store/auth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_AND_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export default function RegisterScreen() {
  const register        = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_ID || undefined,
    androidClientId: GOOGLE_AND_ID || undefined,
    iosClientId:     GOOGLE_IOS_ID || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken     = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      if (idToken || accessToken) handleGoogleToken((idToken || accessToken)!);
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la cuenta con Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim().toLowerCase(), form.password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    borderWidth: 1.5, borderColor: '#2D2060', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: 'white', backgroundColor: '#1E1A35',
  } as const;

  const fields = [
    { key: 'name',     label: 'Nombre completo', placeholder: 'Tu nombre',           keyboardType: 'default' as const,       secure: false, autoComplete: 'name' as const },
    { key: 'email',    label: 'Email',            placeholder: 'tu@email.com',        keyboardType: 'email-address' as const, secure: false, autoComplete: 'email' as const },
    { key: 'password', label: 'Contrasena',       placeholder: 'Minimo 6 caracteres', keyboardType: 'default' as const,      secure: true,  autoComplete: 'new-password' as const },
  ];

  const showGoogle = Boolean(GOOGLE_WEB_ID || GOOGLE_AND_ID);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0D0B1A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#6C3DE0', letterSpacing: -1 }}>Conect</Text>
          <Text style={{ color: '#6B5FA3', marginTop: 6, fontSize: 15 }}>Crea tu cuenta gratis</Text>
        </View>

        {showGoogle && (
          <View>
            <TouchableOpacity
              onPress={() => promptAsync()}
              disabled={!request || googleLoading}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1E1A35', borderWidth: 1.5, borderColor: '#2D2060',
                borderRadius: 14, paddingVertical: 14, gap: 10,
              }}
            >
              {googleLoading
                ? <ActivityIndicator color="#8B5CF6" />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#EDE9FE' }}>G</Text>
                    <Text style={{ color: '#EDE9FE', fontWeight: '600', fontSize: 15 }}>
                      Registrarse con Google
                    </Text>
                  </View>
                )
              }
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#2D2060' }} />
              <Text style={{ color: '#6B5FA3', fontSize: 13 }}>o con email</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#2D2060' }} />
            </View>
          </View>
        )}

        <View style={{ gap: 16 }}>
          {fields.map((field) => (
            <View key={field.key}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#EDE9FE', marginBottom: 8 }}>{field.label}</Text>
              <TextInput
                style={inputStyle}
                placeholder={field.placeholder}
                placeholderTextColor="#6B5FA3"
                value={(form as any)[field.key]}
                onChangeText={(v) => update(field.key, v)}
                keyboardType={field.keyboardType}
                autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                secureTextEntry={field.secure}
                autoComplete={field.autoComplete}
              />
            </View>
          ))}

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
            <LinearGradient
              colors={loading ? ['#3B1F8C', '#3B1F8C'] : ['#6C3DE0', '#EC4899']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Crear cuenta</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
          <Text style={{ color: '#6B5FA3', fontSize: 14 }}>Ya tenes cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#EC4899', fontWeight: '700', fontSize: 14 }}>Ingresa</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
