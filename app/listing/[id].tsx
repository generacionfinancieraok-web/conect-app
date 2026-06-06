import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  Share, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi, conversationsApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatPrice, timeAgo, CONDITION_LABEL } from '@/lib/utils';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [contactLoading, setContactLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    listingsApi.getById(id)
      .then((d) => setListing(d.listing))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleContact() {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setContactLoading(true);
    try {
      const data = await conversationsApi.create(id);
      router.push(`/chat/${data.conversation.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setContactLoading(false);
    }
  }

  async function handleBuy() {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setBuyLoading(true);
    try {
      const data = await paymentsApi.createPreference(id);
      router.push({ pathname: '/payment/result', params: { url: data.initPoint } });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBuyLoading(false);
    }
  }

  async function handleShare() {
    await Share.share({
      message: `${listing.title} — ${formatPrice(listing.price, listing.currency)}\nMiralo en Conect`,
    });
  }

  if (loading) return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color="#2563eb" size="large" />
    </View>
  );

  if (!listing) return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-gray-400 text-lg">Publicación no encontrada</Text>
    </View>
  );

  const images = listing.images || [];
  const isOwner = user?.id === listing.user.id;

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Galería */}
        <View style={{ height: width * 0.8, backgroundColor: '#f3f4f6' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {images.length > 0 ? images.map((img: any, i: number) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={{ width, height: width * 0.8 }}
                contentFit="contain"
              />
            )) : (
              <View style={{ width, height: width * 0.8 }} className="items-center justify-center">
                <Text className="text-6xl">📦</Text>
              </View>
            )}
          </ScrollView>

          {/* Dots */}
          {images.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_: any, i: number) => (
                <View
                  key={i}
                  className={`rounded-full ${i === imgIdx ? 'w-4 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-white/60'}`}
                />
              ))}
            </View>
          )}

          {/* Sold overlay */}
          {listing.status === 'SOLD' && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center">
              <View className="bg-white px-6 py-3 rounded-2xl">
                <Text className="font-bold text-gray-800 text-lg">Vendido</Text>
              </View>
            </View>
          )}
        </View>

        <View className="px-4 pt-4 pb-24">
          {/* Precio y título */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900">
                {formatPrice(listing.price, listing.currency)}
              </Text>
              <Text className="text-lg text-gray-800 mt-1">{listing.title}</Text>
            </View>
            <View className="flex-row gap-2 ml-2">
              <TouchableOpacity onPress={() => setLiked(!liked)} className="p-2">
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={liked ? '#ef4444' : '#9ca3af'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} className="p-2">
                <Ionicons name="share-outline" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags */}
          <View className="flex-row gap-2 mt-3 flex-wrap">
            <View className="bg-gray-100 rounded-full px-3 py-1">
              <Text className="text-xs font-medium text-gray-600">
                {CONDITION_LABEL[listing.condition]}
              </Text>
            </View>
            <View className="bg-gray-100 rounded-full px-3 py-1">
              <Text className="text-xs font-medium text-gray-600">
                {listing.category?.name}
              </Text>
            </View>
          </View>

          {/* Ubicación */}
          <View className="flex-row items-center gap-1 mt-3">
            <Ionicons name="location-outline" size={15} color="#9ca3af" />
            <Text className="text-sm text-gray-500">
              {listing.city}, {listing.province}
            </Text>
            <Text className="text-sm text-gray-400 ml-2">
              · {listing.views} vistas · {timeAgo(listing.createdAt)}
            </Text>
          </View>

          {/* Descripción */}
          <View className="mt-5 pt-5 border-t border-gray-100">
            <Text className="font-semibold text-gray-800 mb-2">Descripción</Text>
            <Text className="text-gray-600 text-sm leading-relaxed">{listing.description}</Text>
          </View>

          {/* Vendedor */}
          <TouchableOpacity
            onPress={() => router.push(`/profile/${listing.user.id}`)}
            className="mt-5 pt-5 border-t border-gray-100 flex-row items-center gap-3"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-blue-100 overflow-hidden items-center justify-center">
              {listing.user.image ? (
                <Image
                  source={{ uri: listing.user.image }}
                  style={{ width: 48, height: 48 }}
                />
              ) : (
                <Text className="text-blue-600 font-bold text-xl">
                  {listing.user.name?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{listing.user.name}</Text>
              {listing.user.ratingCount > 0 ? (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Ionicons name="star" size={12} color="#fbbf24" />
                  <Text className="text-sm text-gray-500">
                    {listing.user.rating.toFixed(1)} ({listing.user.ratingCount})
                  </Text>
                </View>
              ) : (
                <Text className="text-xs text-gray-400">Sin calificaciones</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CTA flotante */}
      {!isOwner && listing.status === 'ACTIVE' && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleContact}
              disabled={contactLoading}
              className="flex-1 border-2 border-blue-600 rounded-xl py-3.5 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-blue-600 font-bold">
                {contactLoading ? '...' : 'Contactar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBuy}
              disabled={buyLoading}
              className="flex-1 bg-blue-600 rounded-xl py-3.5 items-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold">
                {buyLoading ? 'Procesando...' : 'Comprar'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {isOwner && (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-3.5 items-center"
            onPress={() => Alert.alert('Editar', 'Función de edición próximamente')}
          >
            <Text className="text-white font-bold">Editar publicación</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}
