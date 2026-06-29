import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    profileApi.getMe().then((d) => {
      setName(d.user.name ?? '');
      setBio(d.user.bio ?? '');
      setFetching(false);
    }).catch(() => setFetching(false));
  }, []);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es obligatorio'); return; }
    setLoading(true);
    try {
      const data = await profileApi.updateMe({ name: name.trim(), bio: bio.trim() || null });
      // Update local auth store name
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

        {/* Avatar placeholder */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#6C3DE0',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: '#6C3DE0' }}>
              {name[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
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
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={['#6C3DE0', '#EC4899']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
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
