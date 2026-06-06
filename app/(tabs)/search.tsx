import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchApi, categoriesApi } from '@/lib/api';
import { PROVINCES } from '@/lib/utils';
import ListingCard from '@/components/ListingCard';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    category: '', province: '', condition: '', sortBy: 'newest',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    categoriesApi.getAll().then((d) => setCategories(d.categories));
  }, []);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await searchApi.search({
        q: query,
        ...filters,
        limit: 20,
      });
      setListings(data.listings);
      setTotal(data.pagination.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (submitted) search(submitted);
    else search('');
  }, [submitted, filters]);

  function handleSubmit() {
    setSubmitted(q);
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: prev[key as keyof typeof prev] === value ? '' : value }));
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Barra de búsqueda */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 gap-2">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-2.5 text-base text-gray-900"
              placeholder="Buscar artículos..."
              value={q}
              onChangeText={setQ}
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => { setQ(''); setSubmitted(''); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border ${showFilters ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
          >
            <Ionicons name="options-outline" size={20} color={showFilters ? '#fff' : '#374151'} />
          </TouchableOpacity>
        </View>

        {/* Filtros expandibles */}
        {showFilters && (
          <View className="mt-3 gap-3">
            {/* Categoría */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
              <View className="flex-row gap-2">
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setFilter('category', c.slug)}
                    className={`px-3 py-1.5 rounded-full border ${
                      filters.category === c.slug ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${filters.category === c.slug ? 'text-white' : 'text-gray-700'}`}>
                      {c.icon} {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Ordenar */}
            <View className="flex-row gap-2">
              {[
                { v: 'newest', l: 'Recientes' },
                { v: 'price_asc', l: '$ Menor' },
                { v: 'price_desc', l: '$ Mayor' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.v}
                  onPress={() => setFilter('sortBy', s.v)}
                  className={`px-3 py-1.5 rounded-full border ${
                    filters.sortBy === s.v ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-medium ${filters.sortBy === s.v ? 'text-white' : 'text-gray-700'}`}>
                    {s.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Resultados */}
      {loading ? (
        <ActivityIndicator color="#2563eb" size="large" className="mt-12" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerClassName="px-3 pt-3 pb-6"
          columnWrapperClassName="justify-between"
          ListHeaderComponent={
            submitted || Object.values(filters).some(Boolean) ? (
              <Text className="text-sm text-gray-400 mb-3 px-1">
                {total} resultado{total !== 1 ? 's' : ''}
                {submitted ? ` para "${submitted}"` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl mb-2">🔍</Text>
              <Text className="text-gray-400 font-medium">
                {submitted ? 'Sin resultados' : 'Buscá algo para empezar'}
              </Text>
            </View>
          }
          renderItem={({ item }) => <ListingCard listing={item} />}
        />
      )}
    </SafeAreaView>
  );
}
