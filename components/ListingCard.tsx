import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice, timeAgo, CONDITION_LABEL } from '@/lib/utils';
import { favoritesApi } from '@/lib/api';

const CONDITION_DOT: Record<string, string> = {
  NEW: '#3B82F6', LIKE_NEW: '#22C55E', GOOD: '#F59E0B', FAIR: '#F97316', POOR: '#EF4444',
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

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
    promoted?: boolean;
    favorited?: boolean;
    images: { url: string }[];
  };
}

export default function ListingCard({ listing }: Props) {
  const image = listing.images[0]?.url;
  const [isFavorited, setIsFavorited] = useState(listing.favorited ?? false);

  async function handleToggleFavorite() {
    const prev = isFavorited;
    setIsFavorited(!prev); // optimistic
    try {
      const res = await favoritesApi.toggle(listing.id);
      setIsFavorited(res.favorited);
    } catch {
      setIsFavorited(prev); // revert on error
    }
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.85}
      style={{
        width: CARD_WIDTH,
        backgroundColor: '#15122B',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: listing.promoted ? '#6C3DE0' : '#2D2060',
      }}
    >
      <View style={{ aspectRatio: 4 / 3, position: 'relative' }}>
        <Image
          source={image ? { uri: image } : require('../assets/placeholder.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
        {listing.status === 'SOLD' && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontWeight: '700', color: '#15122B', fontSize: 12 }}>Vendido</Text>
            </View>
          </View>
        )}
        <View style={{
          position: 'absolute', top: 8, left: 8,
          backgroundColor: 'rgba(15,23,42,0.88)',
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
          flexDirection: 'row', alignItems: 'center', gap: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CONDITION_DOT[listing.condition] ?? '#6B7280' }} />
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#EDE9FE' }}>
            {CONDITION_LABEL[listing.condition]}
          </Text>
        </View>
        {listing.promoted && (
          <View style={{
            position: 'absolute', top: 8, right: 8,
            backgroundColor: '#6C3DE0',
            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
          }}>
            <Text style={{ fontSize: 9, color: 'white' }}>⭐</Text>
          </View>
        )}
        {/* Botón favorito */}
        <TouchableOpacity
          onPress={handleToggleFavorite}
          activeOpacity={0.8}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            backgroundColor: 'rgba(15,23,42,0.75)',
            borderRadius: 20, padding: 5,
          }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorited ? '#EC4899' : '#EDE9FE'}
          />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: '800', color: '#EC4899', fontSize: 15 }}>
          {formatPrice(listing.price, listing.currency)}
        </Text>
        <Text style={{ color: '#EDE9FE', fontSize: 13, marginTop: 2 }} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={{ color: '#6B5FA3', fontSize: 11, marginTop: 6 }}>
          {listing.city} · {timeAgo(listing.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
