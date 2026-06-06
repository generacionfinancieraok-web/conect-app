import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { categoriesApi, listingsApi, uploadImage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { PROVINCES, CONDITIONS } from '@/lib/utils';

type Step = 'photos' | 'details' | 'location';

export default function SellScreen() {
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>('photos');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'ARS',
    condition: 'GOOD',
    categoryId: '',
    city: '',
    province: '',
  });

  useEffect(() => {
    categoriesApi.getAll().then((d) => setCategories(d.categories));
  }, []);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="camera-outline" size={56} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-4">Publicá gratis</Text>
        <Text className="text-gray-400 text-center mt-2 mb-6">
          Ingresá a tu cuenta para publicar tus artículos
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="bg-blue-600 rounded-xl py-3.5 px-8"
        >
          <Text className="text-white font-bold">Ingresar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function update(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8 - images.length,
    });
    if (!result.canceled) {
      setImages((prev) => [
        ...prev,
        ...result.assets.map((a) => ({ uri: a.uri })),
      ].slice(0, 8));
    }
  }

  async function takePicture() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && images.length < 8) {
      setImages((prev) => [...prev, { uri: result.assets[0].uri }]);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function canProceed(): boolean {
    if (step === 'photos') return images.length > 0;
    if (step === 'details') return !!(form.title && form.description && form.price && form.categoryId);
    if (step === 'location') return !!(form.city && form.province);
    return false;
  }

  async function handlePublish() {
    if (!canProceed()) return;
    setLoading(true);
    try {
      // Subir imágenes
      const uploaded = await Promise.all(images.map((img) => uploadImage(img.uri)));

      const listing = await listingsApi.create({
        ...form,
        price: parseFloat(form.price),
        images: uploaded.map((u) => u.url),
      });

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

  const STEPS: Step[] = ['photos', 'details', 'location'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Publicar artículo</Text>
        {/* Progress */}
        <View className="flex-row gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full ${i <= stepIdx ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* PASO 1: Fotos */}
        {step === 'photos' && (
          <View className="p-4 gap-4">
            <Text className="text-base font-semibold text-gray-800">
              Fotos del artículo
              <Text className="text-gray-400 font-normal"> (mín. 1, máx. 8)</Text>
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {images.map((img, i) => (
                <View key={i} className="relative">
                  <RNImage
                    source={{ uri: img.uri }}
                    className="w-24 h-24 rounded-xl"
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-gray-800 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View className="absolute bottom-1 left-1 bg-blue-600 rounded px-1">
                      <Text className="text-white text-xs">Principal</Text>
                    </View>
                  )}
                </View>
              ))}

              {images.length < 8 && (
                <TouchableOpacity
                  onPress={pickImages}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50"
                >
                  <Ionicons name="add" size={28} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 mt-0.5">Galería</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={takePicture}
              className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-xl p-3.5"
            >
              <Ionicons name="camera-outline" size={22} color="#2563eb" />
              <Text className="text-blue-600 font-medium">Tomar foto con la cámara</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PASO 2: Detalles */}
        {step === 'details' && (
          <View className="p-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Título *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Ej: iPhone 13 128GB Negro"
                value={form.title}
                onChangeText={(v) => update('title', v)}
                maxLength={100}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Descripción *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Describí el artículo: características, estado, motivo de venta..."
                value={form.description}
                onChangeText={(v) => update('description', v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={2000}
                style={{ minHeight: 100 }}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">Precio *</Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => update('currency', form.currency === 'ARS' ? 'USD' : 'ARS')}
                    className="bg-gray-100 border border-gray-200 rounded-l-xl px-3 items-center justify-center border-r-0"
                  >
                    <Text className="text-gray-600 font-medium">{form.currency}</Text>
                  </TouchableOpacity>
                  <TextInput
                    className="flex-1 bg-white border border-gray-200 rounded-r-xl px-3 py-3 text-base text-gray-900"
                    placeholder="0"
                    value={form.price}
                    onChangeText={(v) => update('price', v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">Estado *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-1.5"
                >
                  {CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => update('condition', c.value)}
                      className={`px-3 py-2 rounded-xl border ${
                        form.condition === c.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${form.condition === c.value ? 'text-white' : 'text-gray-700'}`}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Categoría *</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => update('categoryId', c.id)}
                    className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                      form.categoryId === c.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className="text-sm">{c.icon}</Text>
                    <Text className={`text-xs font-medium ${form.categoryId === c.id ? 'text-white' : 'text-gray-700'}`}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* PASO 3: Ubicación */}
        {step === 'location' && (
          <View className="p-4 gap-4">
            <Text className="text-base font-semibold text-gray-800">¿Dónde está el artículo?</Text>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Provincia *</Text>
              <ScrollView style={{ maxHeight: 200 }} className="bg-white border border-gray-200 rounded-xl">
                {PROVINCES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => update('province', p)}
                    className={`px-4 py-3 border-b border-gray-50 flex-row items-center justify-between ${
                      form.province === p ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Text className={`text-base ${form.province === p ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                      {p}
                    </Text>
                    {form.province === p && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Ciudad *</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholder="Ej: Rosario, Córdoba, Mendoza..."
                value={form.city}
                onChangeText={(v) => update('city', v)}
              />
            </View>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      {/* Botones de navegación */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-gray-100 px-4 py-3">
        <View className="flex-row gap-3">
          {stepIdx > 0 && (
            <TouchableOpacity
              onPress={() => setStep(STEPS[stepIdx - 1])}
              className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center"
            >
              <Text className="text-gray-700 font-bold">Atrás</Text>
            </TouchableOpacity>
          )}

          {step !== 'location' ? (
            <TouchableOpacity
              onPress={() => canProceed() && setStep(STEPS[stepIdx + 1])}
              disabled={!canProceed()}
              className={`flex-1 rounded-xl py-3.5 items-center ${canProceed() ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text className={`font-bold ${canProceed() ? 'text-white' : 'text-gray-400'}`}>
                Continuar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePublish}
              disabled={!canProceed() || loading}
              className={`flex-1 rounded-xl py-3.5 items-center flex-row justify-center gap-2 ${
                canProceed() && !loading ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              {loading && <ActivityIndicator color="#fff" size="small" />}
              <Text className={`font-bold ${canProceed() && !loading ? 'text-white' : 'text-gray-400'}`}>
                {loading ? 'Publicando...' : 'Publicar ahora'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
