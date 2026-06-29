import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { listingsApi } from '@/lib/api';
import { CONDITIONS } from '@/lib/utils';

const LISTING_TYPES = [
  { value: 'ITEM_WITH_PRICE', label: 'Con precio', icon: '🏷️' },
  { value: 'ITEM_NO_PRICE',   label: 'Sin precio', icon: '📦' },
  { value: 'SERVICE',         label: 'Servicio',   icon: '🔧' },
];

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'ARS',
    condition: 'GOOD',
    listingType: 'ITEM_WITH_PRICE',
  });

  useEffect(() => {
    listingsApi.getById(id).then((data) => {
      const l = data.listing;
      setForm({
        title: l.title ?? '',
        description: l.description ?? '',
        price: String(l.price ?? ''),
        currency: l.currency ?? 'ARS',
        condition: l.condition ?? 'GOOD',
        listingType: l.listingType ?? 'ITEM_WITH_PRICE',
      });
      setLoading(false);
    }).catch(() => {
      Alert.alert('Error', 'No se pudo cargar la publicación');
      router.back();
    });
  }, [id]);

  function update(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    setSaving(true);
    try {
      await listingsApi.update(id, {
        title: form.title,
        description: form.description,
        price: form.listingType === 'ITEM_WITH_PRICE' ? parseFloat(form.price) || 0 : 0,
        currency: form.currency,
        condition: form.condition,
        listingType: form.listingType,
      });
      Alert.alert('¡Listo!', 'Publicación actualizada', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar');
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await listingsApi.delete(id);
      Alert.alert('Eliminada', 'La publicación fue eliminada', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo eliminar');
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
  }

  const input = {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: 'white' as const,
  };
  const label = { fontSize: 13, fontWeight: '600' as const, color: '#E9D5FF', marginBottom: 8 };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C3DE0" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#EDE9FE" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#EDE9FE' }}>Editar publicación</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>

        {/* Tipo */}
        <View>
          <Text style={label}>Tipo de publicación</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LISTING_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => update('listingType', t.value)}
                activeOpacity={0.8}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 2,
                  borderColor: form.listingType === t.value ? '#6C3DE0' : '#2D2060',
                  backgroundColor: form.listingType === t.value ? '#1E1248' : '#15122B',
                }}
              >
                <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                <Text style={{ fontSize: 10, color: form.listingType === t.value ? '#C4B5FD' : '#64748B', marginTop: 4, textAlign: 'center' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Título */}
        <View>
          <Text style={label}>Título *</Text>
          <TextInput
            style={input}
            value={form.title}
            onChangeText={(v) => update('title', v)}
            placeholder="Título de la publicación"
            placeholderTextColor="#475569"
            maxLength={100}
          />
        </View>

        {/* Descripción */}
        <View>
          <Text style={label}>Descripción</Text>
          <TextInput
            style={[input, { minHeight: 100, textAlignVertical: 'top' }]}
            value={form.description}
            onChangeText={(v) => update('description', v)}
            placeholder="Describí tu artículo..."
            placeholderTextColor="#475569"
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
        </View>

        {/* Precio (solo si tiene precio) */}
        {form.listingType === 'ITEM_WITH_PRICE' && (
          <View>
            <Text style={label}>Precio</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => update('currency', form.currency === 'ARS' ? 'USD' : 'ARS')}
                style={{
                  backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
                  borderRadius: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#E9D5FF', fontWeight: '700' }}>{form.currency}</Text>
              </TouchableOpacity>
              <TextInput
                style={[input, { flex: 1 }]}
                value={form.price}
                onChangeText={(v) => update('price', v)}
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Estado */}
        <View>
          <Text style={label}>Estado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => update('condition', c.value)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                    borderColor: form.condition === c.value ? '#6C3DE0' : '#2D2060',
                    backgroundColor: form.condition === c.value ? '#6C3DE0' : '#15122B',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: form.condition === c.value ? 'white' : '#94A3B8' }}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Guardar */}
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar cambios</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Zona de peligro */}
        <View style={{ borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 16, padding: 16, marginTop: 8 }}>
          <Text style={{ color: '#FCA5A5', fontWeight: '700', marginBottom: 8 }}>Zona de peligro</Text>
          {!showDeleteConfirm ? (
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              style={{ borderWidth: 1, borderColor: '#EF4444', borderRadius: 12, padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600' }}>Eliminar publicación</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#FCA5A5', fontSize: 13 }}>¿Estás seguro? Esta acción no se puede deshacer.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#2D2060', borderRadius: 12, padding: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={deleting}
                  style={{ flex: 1, backgroundColor: '#EF4444', borderRadius: 12, padding: 12, alignItems: 'center' }}
                >
                  {deleting
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text style={{ color: 'white', fontWeight: '700' }}>Sí, eliminar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
