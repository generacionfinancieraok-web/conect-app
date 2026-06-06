import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi, categoriesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import ListingCard from '@/components/ListingCard';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count: { listings: number };
}

export default function HomeScreen() {
  const { isAuthenticated, user } = useAuthStore();
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [listRes, catRes] = await Promise.all([
        listingsApi.getAll({
          limit: 20,
          ...(selectedCategory ? { category: selectedCategory } : {}),
        }),
        categoriesApi.getAll(),
      ]);
      setListings(listRes.listings);
      setCategories(catRes.categories);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-blue-600">Conect</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(isAuthenticated ? '/inbox' : '/(auth)/login')}>
            <Ionicons name="chatbubble-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="mx-4 mt-4 bg-blue-600 rounded-2xl p-5">
          <Text className="text-white font-bold text-xl">
            {isAuthenticated ? `¡Hola, ${user?.name?.split(' ')[0]}! 👋` : 'Compra y vende cerca tuyo'}
          </Text>
          <Text className="text-blue-100 text-sm mt-1">
            Miles de artículos en Argentina
          </Text>
          <TouchableOpacity
            onPress={() => router.push(isAuthenticated ? '/(tabs)/sell' : '/(auth)/register')}
            className="mt-3 bg-white rounded-xl py-2.5 px-4 self-start"
          >
            <Text className="text-blue-600 font-bold text-sm">
              {isAuthenticated ? 'Publicar artículo' : 'Registrarse gratis'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categorías */}
        <View className="mt-5">
          <Text className="px-4 text-base font-semibold text-gray-800 mb-3">Categorías</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 gap-2"
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory('')}
              className={`items-center px-3 py-2.5 rounded-xl border ${
                !selectedCategory ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
              }`}
            >
              <Text className="text-lg">🔥</Text>
              <Text className={`text-xs font-medium mt-0.5 ${!selectedCategory ? 'text-white' : 'text-gray-700'}`}>
                Todo
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.slug)}
                className={`items-center px-3 py-2.5 rounded-xl border min-w-[64px] ${
                  selectedCategory === cat.slug ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                }`}
              >
                <Text className="text-lg">{cat.icon}</Text>
                <Text
                  className={`text-xs font-medium mt-0.5 ${selectedCategory === cat.slug ? 'text-white' : 'text-gray-700'}`}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Feed */}
        <View className="mt-5 px-3">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-base font-semibold text-gray-800">
              {selectedCategory ? 'Resultados' : 'Publicaciones recientes'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Text className="text-blue-600 text-sm font-medium">Ver todo →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#2563eb" size="large" className="mt-8" />
          ) : listings.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-2">📦</Text>
              <Text className="text-gray-400">No hay publicaciones aún</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
