import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { profileApi, apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.image ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    profileApi.getMe().then((d) => {
      setName(d.user.name ?? '');
      setBio(d.user.bio ?? '');
      setAvatarUri(d.user.image ?? null);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, []);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  }

  async function uploadAvatar(uri: string): Promise<string | null> {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      formData.append('file', { uri, name: filename, type: mimeType } as any);

      // Obtener token del store
      const { token: authToken } = useAuthStore.getState();
      const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al subir la foto');
      }

      const data = await res.json();
      return data.user?.image ?? null;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir la foto');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    setLoading(true);
    try {
      // Subir avatar si cambió
      if (avatarChanged && avatarUri) {
        const newUrl = await uploadAvatar(avatarUri);
        if (newUrl) {
          setAvatarUri(newUrl);
          updateUser({ image: newUrl });
        }
      }

      // Guardar nombre y bio
      const data = await profileApi.updateMe({ name: name.trim(), bio: bio.trim() || null });
      updateUser({ name: data.user.name });
      Alert.alert('¡Listo!', 'Perfil actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar');
    }
    setLoading(false);
  }

  const input = {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#2D2060',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: 'white' as const,
  };
  const label = { fontSize: 13, fontWeight: '600' as const, color: '#E9D5FF', marginBottom: 8 };
  const initials = name.trim()
    ? name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (fetching) {
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
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#EDE9FE' }}>Editar perfil</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={{ position: 'relative' }}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#6C3DE0' }}
              />
            ) : (
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#6C3DE0',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#6C3DE0' }}>{initials}</Text>
              </View>
            )}
            {/* Ícono de cámara sobre el avatar */}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: '#6C3DE0', borderRadius: 12, padding: 4,
              borderWidth: 2, borderColor: '#0F172A',
            }}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar} style={{ marginTop: 8 }}>
            <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600' }}>Cambiar foto</Text>
          </TouchableOpacity>
          {uploadingAvatar && (
            <Text style={{ color: '#A89ED0', fontSize: 11, marginTop: 4 }}>Subiendo foto...</Text>
          )}
        </View>

        {/* Nombre */}
        <View>
          <Text style={label}>Nombre *</Text>
          <TextInput
            style={input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor="#475569"
            maxLength={80}
          />
        </View>

        {/* Bio */}
        <View>
          <Text style={label}>Biografía <Text style={{ color: '#64748B', fontWeight: '400' }}>(opcional)</Text></Text>
          <TextInput
            style={[input, { minHeight: 100, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Contá algo sobre vos..."
            placeholderTextColor="#475569"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{bio.length}/500</Text>
        </View>

        {/* Guardar */}
        <TouchableOpacity onPress={handleSave} disabled={loading || uploadingAvatar} activeOpacity={0.85} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Guardar cambios</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
