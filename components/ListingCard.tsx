import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatPrice, timeAgo, CONDITION_LABEL } from '@/lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2; // 2 columnas con padding

interface Props {
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    city: string;
    province: string;
    condition: string;
    status: string;
    createdAt: string;
    images: { url: string }[];
  };
}

export default function ListingCard({ listing }: Props) {
  const image = listing.images[0]?.url;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.9}
      style={{ width: CARD_WIDTH }}
      className="bg-white rounded-2xl overflow-hidden mb-3 shadow-sm border border-gray-100"
    >
      {/* Imagen */}
      <View className="relative" style={{ aspectRatio: 4 / 3 }}>
        <Image
          source={image ? { uri: image } : require('@/assets/placeholder.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
        {listing.status === 'SOLD' && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <View className="bg-white px-3 py-1 rounded-full">
              <Text className="font-bold text-gray-800 text-xs">Vendido</Text>
            </View>
          </View>
        )}
        <View className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded-full">
          <Text className="text-xs font-medium text-gray-700">
            {CONDITION_LABEL[listing.condition]}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View className="p-2.5">
        <Text className="font-bold text-gray-900 text-base">
          {formatPrice(listing.price, listing.currency)}
        </Text>
        <Text className="text-gray-700 text-sm mt-0.5" numberOfLines={2}>
          {listing.title}
        </Text>
        <Text className="text-gray-400 text-xs mt-1.5">
          {listing.city} · {timeAgo(listing.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
