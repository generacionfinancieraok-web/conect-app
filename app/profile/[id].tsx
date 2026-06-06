import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/lib/api';
import ListingCard from '@/components/ListingCard';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/profile/${id}`)
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color="#2563eb" />
    </View>
  );

  if (!profile) return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-gray-400">Usuario no encontrado</Text>
    </View>
  );

  const activeListings = profile.listings?.filter((l: any) => l.status === 'ACTIVE') || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-5 py-6 border-b border-gray-100">
          <View className="items-center">
            <View className="w-20 h-20 rounded-full bg-blue-100 overflow-hidden items-center justify-center mb-3">
              {profile.image ? (
                <Image source={{ uri: profile.image }} style={{ width: 80, height: 80 }} />
              ) : (
                <Text className="text-4xl font-bold text-blue-600">
                  {profile.name?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            <Text className="text-xl font-bold text-gray-900">{profile.name}</Text>

            {profile.ratingCount > 0 && (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text className="text-gray-600 text-sm">
                  {profile.rating.toFixed(1)} ({profile.ratingCount} reseñas)
                </Text>
              </View>
            )}

            <View className="flex-row gap-6 mt-4">
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{activeListings.length}</Text>
                <Text className="text-xs text-gray-400">publicaciones</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-green-600">
                  {profile.listings?.filter((l: any) => l.status === 'SOLD').length || 0}
                </Text>
                <Text className="text-xs text-gray-400">vendidos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Publicaciones */}
        {activeListings.length > 0 ? (
          <View className="px-3 pt-5">
            <Text className="text-base font-semibold text-gray-800 px-1 mb-3">
              Publicaciones activas
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {activeListings.map((l: any) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center py-12">
            <Text className="text-3xl mb-2">📦</Text>
            <Text className="text-gray-400">Sin publicaciones activas</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
