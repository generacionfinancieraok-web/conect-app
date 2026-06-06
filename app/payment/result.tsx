import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'success' | 'failure' | null>(null);

  const APP_URL = process.env.EXPO_PUBLIC_API_URL || '';

  function handleNavigationChange(navState: { url: string }) {
    const u = navState.url;
    if (u.includes('/payment/success')) setStatus('success');
    else if (u.includes('/payment/failure')) setStatus('failure');
    else if (u.includes('/payment/pending')) setStatus('pending');
  }

  if (status) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        {status === 'success' ? (
          <>
            <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
            <Text className="text-2xl font-bold text-gray-900 mt-4">¡Pago exitoso!</Text>
            <Text className="text-gray-500 text-center mt-2">
              Tu pago fue procesado correctamente. El vendedor recibirá una notificación.
            </Text>
          </>
        ) : status === 'pending' ? (
          <>
            <Ionicons name="time" size={80} color="#f59e0b" />
            <Text className="text-2xl font-bold text-gray-900 mt-4">Pago pendiente</Text>
            <Text className="text-gray-500 text-center mt-2">
              Tu pago está siendo procesado. Te notificaremos cuando se confirme.
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="close-circle" size={80} color="#ef4444" />
            <Text className="text-2xl font-bold text-gray-900 mt-4">Pago no completado</Text>
            <Text className="text-gray-500 text-center mt-2">
              Hubo un problema. No se realizó ningún cobro.
            </Text>
          </>
        )}

        <View className="w-full gap-3 mt-8">
          {status === 'success' && (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/inbox')}
              className="bg-blue-600 rounded-xl py-3.5 items-center"
            >
              <Text className="text-white font-bold">Ver mensajes</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="border border-gray-200 rounded-xl py-3.5 items-center"
          >
            <Text className="text-gray-700 font-semibold">Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="font-semibold text-gray-900 flex-1">Checkout MercadoPago</Text>
        {loading && <ActivityIndicator color="#2563eb" size="small" />}
      </View>

      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center bg-white">
            <ActivityIndicator color="#2563eb" size="large" />
            <Text className="text-gray-400 mt-3">Cargando MercadoPago...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
