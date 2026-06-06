import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatPrice, timeAgo } from '@/lib/utils';
import ListingCard from '@/components/ListingCard';

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoading(true);
      listingsApi.getAll({ userId: user.id, limit: 20 })
        .then((d) => setListings(d.listings))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="person-outline" size={56} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-4">Tu perfil</Text>
        <Text className="text-gray-400 text-center mt-2 mb-6">
          Ingresá para ver tu perfil y publicaciones
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="bg-blue-600 rounded-xl py-3.5 px-8 mb-3"
        >
          <Text className="text-white font-bold">Ingresar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text className="text-blue-600 font-medium">Crear cuenta</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  const activeListings = listings.filter((l) => l.status === 'ACTIVE');
  const soldListings = listings.filter((l) => l.status === 'SOLD');

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header del perfil */}
        <View className="bg-white px-5 pt-5 pb-6 border-b border-gray-100">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-blue-100 overflow-hidden items-center justify-center">
              {user?.image ? (
                <Image source={{ uri: user.image }} style={{ width: 64, height: 64 }} />
              ) : (
                <Text className="text-3xl font-bold text-blue-600">
                  {user?.name?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
              <Text className="text-sm text-gray-400">{user?.email}</Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row mt-4 gap-3">
            {[
              { label: 'Publicaciones', value: activeListings.length },
              { label: 'Vendidos', value: soldListings.length },
              { label: 'Calificación', value: '—' },
            ].map((s) => (
              <View key={s.label} className="flex-1 bg-gray-50 rounded-xl py-3 items-center">
                <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Acciones rápidas */}
        <View className="bg-white mt-3 border-y border-gray-100">
          {[
            { icon: 'add-circle-outline', label: 'Nueva publicación', onPress: () => router.push('/(tabs)/sell') },
            { icon: 'chatbubbles-outline', label: 'Mis mensajes', onPress: () => router.push('/(tabs)/inbox') },
            { icon: 'notifications-outline', label: 'Notificaciones', onPress: () => Alert.alert('Próximamente', 'Las notificaciones estarán disponibles pronto') },
            { icon: 'settings-outline', label: 'Configuración', onPress: () => Alert.alert('Próximamente', 'Configuración disponible pronto') },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={22} color="#4b5563" />
              <Text className="flex-1 text-base text-gray-800">{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Mis publicaciones activas */}
        {activeListings.length > 0 && (
          <View className="mt-5 px-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">
              Mis publicaciones ({activeListings.length})
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {activeListings.slice(0, 6).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </View>
            {activeListings.length > 6 && (
              <TouchableOpacity className="items-center py-3">
                <Text className="text-blue-600 font-medium">Ver todas →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Cerrar sesión */}
        <View className="px-4 mt-6 mb-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 border border-red-200 rounded-xl py-3.5 bg-red-50"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-500 font-semibold">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
