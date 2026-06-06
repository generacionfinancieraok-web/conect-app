import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-blue-600">Conect</Text>
          <Text className="text-gray-400 mt-1 text-base">Creá tu cuenta gratis</Text>
        </View>

        <View className="gap-4">
          {[
            { key: 'name', label: 'Nombre', placeholder: 'Tu nombre', type: 'default' },
            { key: 'email', label: 'Email', placeholder: 'tu@email.com', type: 'email-address' },
            { key: 'password', label: 'Contraseña', placeholder: 'Mínimo 6 caracteres', type: 'default', secure: true },
          ].map((field) => (
            <View key={field.key}>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">{field.label}</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChangeText={(v) => update(field.key, v)}
                keyboardType={field.type as any}
                autoCapitalize={field.key === 'name' ? 'words' : 'none'}
                secureTextEntry={field.secure}
                autoComplete={field.key === 'email' ? 'email' : field.key === 'password' ? 'new-password' : 'name'}
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className={`rounded-xl py-4 items-center mt-2 ${loading ? 'bg-blue-300' : 'bg-blue-600'}`}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500 text-sm">¿Ya tenés cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold text-sm">Ingresá</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
