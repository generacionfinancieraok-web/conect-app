import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { categoriesApi, listingsApi, uploadImage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CONDITIONS } from '@/lib/utils';

type Step = 'type' | 'photos' | 'details' | 'location';

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

// Barrios de CABA para selector cuando la provincia es CABA
const CABA_BARRIOS = [
  'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo',
  'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitución',
  'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos',
  'Monte Castro', 'Monserrat', 'Nueva Pompeya', 'Núñez', 'Palermo',
  'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios',
  'Puerto Madero', 'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal',
  'San Nicolás', 'San Telmo', 'Vélez Sársfield', 'Versalles', 'Villa Crespo',
  'Villa del Parque', 'Villa Devoto', 'Villa Gral. Mitre', 'Villa Lugano',
  'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real',
  'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza',
];

export default function SellScreen() {
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>('type');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'ARS',
    condition: 'GOOD', categoryId: '', city: '', province: '',
    listingType: 'ITEM_WITH_PRICE',
  });

  useEffect(() => {
    categoriesApi.getAll().then((d) => setCategories(d.categories));
  }, []);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 20, backgroundColor: '#1E293B',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Ionicons name="camera-outline" size={36} color="#6C3DE0" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#E2E8F0' }}>Publicá gratis</Text>
        <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Ingresá para publicar tus artículos
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <LinearGradient
            colors={['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Ingresar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function update(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.8,
      selectionLimit: 8 - images.length,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri }))].slice(0, 8));
    }
  }

  async function takePicture() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && images.length < 8) {
      setImages((prev) => [...prev, { uri: result.assets[0].uri }]);
    }
  }

  function canProceed(): boolean {
    if (step === 'type') return !!(form.listingType);
    if (step === 'photos') return images.length > 0;
    if (step === 'details') {
      if (form.listingType === 'ITEM_WITH_PRICE') return !!(form.title && form.description && form.price && form.categoryId);
      return !!(form.title && form.description && form.categoryId);
    }
    if (step === 'location') return !!(form.city && form.province);
    return false;
  }

  async function handlePublish() {
    if (!canProceed()) return;
    setLoading(true);
    try {
      const uploaded = await Promise.all(images.map((img) => uploadImage(img.uri)));
      const payload: any = {
        ...form,
        images: uploaded.map((u) => u.url),
      };
      if (form.listingType === 'ITEM_WITH_PRICE') {
        payload.price = parseFloat(form.price) || 0;
      } else {
        payload.price = 0;
      }
      const listing = await listingsApi.create(payload);
      Alert.alert('¡Publicado!', 'Tu artículo ya está visible', [
        { text: 'Ver publicación', onPress: () => router.push(`/listing/${listing.listing.id}`) },
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo publicar');
    } finally {
      setLoading(false);
    }
  }

  const STEPS: Step[] = ['type', 'photos', 'details', 'location'];
  const stepIdx = STEPS.indexOf(step);

  const inputStyle = {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: 'white',
  };
  const labelStyle = { fontSize: 13, fontWeight: '600' as const, color: '#E9D5FF', marginBottom: 8 };
  const chipActive = { backgroundColor: '#6C3DE0', borderColor: '#6C3DE0' };
  const chipInactive = { backgroundColor: '#1E293B', borderColor: '#2D2060' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={['top']}>
      {/* Header */}
      <View style={{
        backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#2D2060',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#E2E8F0' }}>Publicar artículo</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {STEPS.map((s, i) => (
            <View key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: i <= stepIdx ? '#6C3DE0' : '#2D2060',
            }} />
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* STEP 0: Tipo de publicación */}
        {step === 'type' && (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#E2E8F0', marginBottom: 8 }}>
              ¿Qué querés publicar?
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Elegí el tipo de publicación
            </Text>

            {[
              {
                value: 'ITEM_WITH_PRICE',
                title: 'Artículo con precio',
                desc: 'Vendé un producto con precio fijo',
                icon: '🏷️',
              },
              {
                value: 'ITEM_NO_PRICE',
                title: 'Artículo sin precio',
                desc: 'Publicá sin poner precio (consultá)',
                icon: '📦',
              },
              {
                value: 'SERVICE',
                title: 'Servicio',
                desc: 'Ofrecé un servicio o trabajo',
                icon: '🔧',
              },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => update('listingType', opt.value)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 16,
                  backgroundColor: form.listingType === opt.value ? '#1E1248' : '#15122B',
                  borderWidth: 2,
                  borderColor: form.listingType === opt.value ? '#6C3DE0' : '#2D2060',
                  borderRadius: 16, padding: 16, marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 32 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#E2E8F0' }}>{opt.title}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{opt.desc}</Text>
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2,
                  borderColor: form.listingType === opt.value ? '#6C3DE0' : '#4B5563',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: form.listingType === opt.value ? '#6C3DE0' : 'transparent',
                }}>
                  {form.listingType === opt.value && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 1: Photos */}
        {step === 'photos' && (
          <View style={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#E2E8F0' }}>
              Fotos del artículo{' '}
              <Text style={{ color: '#64748B', fontWeight: '400' }}>(mín. 1, máx. 8)</Text>
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {images.map((img, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <RNImage source={{ uri: img.uri }} style={{ width: 96, height: 96, borderRadius: 14 }} />
                  <TouchableOpacity
                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View style={{
                      position: 'absolute', bottom: 4, left: 4,
                      backgroundColor: '#6C3DE0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                    }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>Principal</Text>
                    </View>
                  )}
                </View>
              ))}
              {images.length < 8 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={{
                    width: 96, height: 96, borderRadius: 14,
                    borderWidth: 2, borderStyle: 'dashed', borderColor: '#2D2060',
                    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B',
                  }}
                >
                  <Ionicons name="add" size={28} color="#64748B" />
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Galería</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={takePicture}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
                borderRadius: 14, padding: 14,
              }}
            >
              <Ionicons name="camera-outline" size={22} color="#6C3DE0" />
              <Text style={{ color: '#6C3DE0', fontWeight: '600' }}>Tomar foto con la cámara</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Details */}
        {step === 'details' && (
          <View style={{ padding: 16, gap: 16 }}>
            <View>
              <Text style={labelStyle}>Título *</Text>
              <TextInput
                style={inputStyle}
                placeholder="Ej: iPhone 13 128GB Negro"
                placeholderTextColor="#475569"
                value={form.title}
                onChangeText={(v) => update('title', v)}
                maxLength={100}
              />
            </View>

            <View>
              <Text style={labelStyle}>Descripción *</Text>
              <TextInput
                style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="Describí el artículo..."
                placeholderTextColor="#475569"
                value={form.description}
                onChangeText={(v) => update('description', v)}
                multiline numberOfLines={4}
                maxLength={2000}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {form.listingType === 'ITEM_WITH_PRICE' && (
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Precio *</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      onPress={() => update('currency', form.currency === 'ARS' ? 'USD' : 'ARS')}
                      style={{
                        backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
                        borderRightWidth: 0, borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
                        paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#E9D5FF', fontWeight: '700' }}>{form.currency}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[inputStyle, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      placeholder="0"
                      placeholderTextColor="#475569"
                      value={form.price}
                      onChangeText={(v) => update('price', v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Estado *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {CONDITIONS.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        onPress={() => update('condition', c.value)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                          ...(form.condition === c.value ? chipActive : chipInactive),
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: form.condition === c.value ? 'white' : '#94A3B8' }}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View>
              <Text style={labelStyle}>Categoría *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => update('categoryId', c.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
                      ...(form.categoryId === c.id ? chipActive : chipInactive),
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: form.categoryId === c.id ? 'white' : '#94A3B8' }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Location */}
        {step === 'location' && (
          <View style={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#E2E8F0' }}>¿Dónde está el artículo?</Text>

            <View>
              <Text style={labelStyle}>Provincia *</Text>
              <ScrollView style={{ maxHeight: 200, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#2D2060' }}>
                {PROVINCES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => { update('province', p); update('city', ''); }}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 13,
                      borderBottomWidth: 1, borderBottomColor: '#2D2060',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: form.province === p ? '#4C1D95' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 15, color: form.province === p ? '#E9D5FF' : '#94A3B8', fontWeight: form.province === p ? '600' : '400' }}>
                      {p}
                    </Text>
                    {form.province === p && <Ionicons name="checkmark" size={18} color="#E9D5FF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text style={labelStyle}>{form.province === 'CABA' ? 'Barrio *' : 'Ciudad *'}</Text>
              {form.province === 'CABA' ? (
                <ScrollView style={{ maxHeight: 200, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#2D2060' }}>
                  {CABA_BARRIOS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      onPress={() => update('city', b)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 13,
                        borderBottomWidth: 1, borderBottomColor: '#2D2060',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: form.city === b ? '#4C1D95' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 15, color: form.city === b ? '#E9D5FF' : '#94A3B8', fontWeight: form.city === b ? '600' : '400' }}>
                        {b}
                      </Text>
                      {form.city === b && <Ionicons name="checkmark" size={18} color="#E9D5FF" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <TextInput
                  style={inputStyle}
                  placeholder="Ej: Rosario"
                  placeholderTextColor="#64748B"
                  value={form.city}
                  onChangeText={(v) => update('city', v)}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#2D2060', flexDirection: 'row', gap: 12 }}>
        {step !== 'type' && (
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2D2060', alignItems: 'center' }}
            onPress={() => setStep(step === 'location' ? 'details' : step === 'details' ? 'photos' : 'type')}
          >
            <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ flex: 2, borderRadius: 14, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}
          onPress={() => {
            if (!canProceed()) { Alert.alert('Faltan datos', 'Completá todos los campos requeridos'); return; }
            if (step === 'type') setStep('photos');
            else if (step === 'photos') setStep('details');
            else if (step === 'details') setStep('location');
            else handlePublish();
          }}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            {loading && <ActivityIndicator color="white" size="small" />}
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
              {step === 'location' ? 'Publicar' : 'Siguiente'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

