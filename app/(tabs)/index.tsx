import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { listingsApi, categoriesApi } from '@/lib/api';
import { IS_DEMO } from '@/lib/mockData';
import { useAuthStore } from '@/store/auth';
import ListingCard from '@/components/ListingCard';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setConnectionError(null);
    try {
      const [listRes, catRes] = await Promise.all([
        listingsApi.getAll({ limit: 20, ...(selectedCategory ? { category: selectedCategory } : {}) }),
        categoriesApi.getAll(),
      ]);
      setListings(listRes.listings);
      setCategories(catRes.categories);
    } catch (e: any) {
      console.error('[Home] fetch error:', e);
      // Detectar si es error de red (backend no disponible) vs error de datos
      const isNetworkError = e.message?.includes('Network request failed')
        || e.message?.includes('fetch')
        || e.message?.includes('ECONNREFUSED')
        || e.name === 'TypeError';
      setConnectionError(
        isNetworkError
          ? `No se puede conectar al servidor.\nURL: ${API_URL}`
          : e.message || 'Error desconocido'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0B1A' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#1E1A35', borderBottomWidth: 1, borderBottomColor: '#2D2060',
      }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#6C3DE0', letterSpacing: -0.5 }}>
          Conect
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="search-outline" size={24} color="#EDE9FE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(isAuthenticated ? '/notifications' : '/(auth)/login')}>
            <Ionicons name="notifications-outline" size={24} color="#EDE9FE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(isAuthenticated ? '/(tabs)/favorites' : '/(auth)/login')}>
            <Ionicons name="bookmark-outline" size={24} color="#EDE9FE" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(isAuthenticated ? '/offers' : '/(auth)/login')}>
            <Ionicons name="pricetag-outline" size={24} color="#EDE9FE" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner modo demo */}
      {IS_DEMO && (
        <View style={{
          backgroundColor: '#1E1A35', borderBottomWidth: 1, borderBottomColor: '#6C3DE0',
          paddingHorizontal: 16, paddingVertical: 8,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <View style={{ backgroundColor: '#6C3DE0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>DEMO</Text>
          </View>
          <Text style={{ color: '#A89ED0', fontSize: 12 }}>
            Datos de ejemplo — 10 usuarios precargados
          </Text>
        </View>
      )}

      {/* Banner error de conexión (solo cuando hay backend configurado pero falla) */}
      {!IS_DEMO && connectionError && (
        <View style={{
          backgroundColor: '#7F1D1D', borderBottomWidth: 1, borderBottomColor: '#EF4444',
          paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row',
          alignItems: 'flex-start', gap: 10,
        }}>
          <Ionicons name="wifi-outline" size={20} color="#FCA5A5" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FCA5A5', fontWeight: '700', fontSize: 13 }}>Sin conexión al backend</Text>
            <Text style={{ color: '#FCA5A5', fontSize: 11, marginTop: 2, opacity: 0.8 }}>{connectionError}</Text>
          </View>
          <TouchableOpacity onPress={() => { setLoading(true); fetchData(); }}>
            <Ionicons name="refresh" size={20} color="#FCA5A5" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C3DE0" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#3B1F8C', '#6C3DE0', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20 }}
        >
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 20, marginBottom: 4 }}>
            {isAuthenticated ? `¡Hola, ${user?.name?.split(' ')[0]}! 👋` : 'Compra y vende cerca tuyo'}
          </Text>
          <Text style={{ color: '#EDE9FE', fontSize: 13, marginBottom: 16 }}>
            Comprá, vendé y contratá servicios cerca tuyo
          </Text>
          <TouchableOpacity
            onPress={() => router.push(isAuthenticated ? '/(tabs)/sell' : '/(auth)/register')}
            style={{
              backgroundColor: 'white', borderRadius: 12,
              paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#6C3DE0', fontWeight: '700', fontSize: 14 }}>
              {isAuthenticated ? '+ Publicar' : 'Registrarse gratis'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Categorías */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ paddingHorizontal: 16, fontSize: 15, fontWeight: '700', color: '#EDE9FE', marginBottom: 12 }}>
            Categorías
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedCategory('')}
              style={{
                alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
                borderRadius: 14, borderWidth: 1.5,
                backgroundColor: !selectedCategory ? '#6C3DE0' : '#1E1A35',
                borderColor: !selectedCategory ? '#6C3DE0' : '#2D2060',
              }}
            >
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', marginTop: 2, color: !selectedCategory ? 'white' : '#A89ED0' }}>
                Todo
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.slug)}
                style={{
                  alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
                  borderRadius: 14, borderWidth: 1.5, minWidth: 70,
                  backgroundColor: selectedCategory === cat.slug ? '#6C3DE0' : '#1E1A35',
                  borderColor: selectedCategory === cat.slug ? '#6C3DE0' : '#2D2060',
                }}
              >
                <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                <Text
                  style={{ fontSize: 11, fontWeight: '600', marginTop: 2, color: selectedCategory === cat.slug ? 'white' : '#A89ED0' }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Feed */}
        <View style={{ marginTop: 20, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#EDE9FE' }}>
              {selectedCategory ? 'Resultados' : 'Publicaciones recientes'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={{ color: '#EC4899', fontSize: 13, fontWeight: '600' }}>Ver todo →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#6C3DE0" size="large" style={{ marginTop: 32 }} />
          ) : listings.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>📦</Text>
              <Text style={{ color: '#6B5FA3', fontSize: 15 }}>No hay publicaciones aún</Text>
              <Text style={{ color: '#6B5FA3', fontSize: 13, marginTop: 4 }}>
                ¡Sé el primero en publicar!
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
