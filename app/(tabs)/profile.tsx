import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listingsApi, reviewsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import ListingCard from '@/components/ListingCard';
import { C } from '@/constants/colors';

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const totalUnread = useInboxStore((s) => s.totalUnread);
  const [listings, setListings] = useState<any[]>([]);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      listingsApi.getAll({ userId: user.id, limit: 20 }).then((d) => setListings(d.listings));
      reviewsApi.getByUser(user.id).then((d) => setRating({ average: d.average, count: d.count }));
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <Ionicons name="person-outline" size={56} color={C.bgBorder} />
        <Text style={s.title}>Tu perfil</Text>
        <Text style={s.subtitle}>Ingresa para ver tu perfil y publicaciones</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.cta}>
          <Text style={s.ctaTxt}>Ingresar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 12 }}>
          <Text style={{ color: C.accent, fontWeight: '600', fontSize: 14 }}>Crear cuenta</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleLogout() {
    Alert.alert('Cerrar sesion', 'Seguro que queres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  const active = listings.filter((l) => l.status === 'ACTIVE');
  const sold   = listings.filter((l) => l.status === 'SOLD');
  const ratingDisplay = rating && rating.count > 0 ? `${rating.average.toFixed(1)} *` : '-';

  const menuItems = [
    { icon: 'create-outline',         label: 'Editar mi perfil',   onPress: () => router.push('/profile/edit') },
    { icon: 'add-circle-outline',     label: 'Nueva publicacion',  onPress: () => router.push('/(tabs)/sell') },
    { icon: 'chatbubbles-outline',    label: 'Mis mensajes',       onPress: () => router.push('/(tabs)/inbox'), badge: totalUnread > 0 ? totalUnread : undefined },
    { icon: 'notifications-outline',  label: 'Notificaciones',     onPress: () => router.push('/notifications') },
    { icon: 'pricetag-outline',       label: 'Mis ofertas',        onPress: () => router.push('/offers') },
    { icon: 'mail-outline',           label: 'Verificar email',    onPress: () => router.push('/verify-email') },
    { icon: 'phone-portrait-outline', label: 'Verificar telefono', onPress: () => router.push('/verify-phone') },
  ];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.profileHeader}>
          <View style={s.avatarWrap}>
            {user?.image
              ? <Image source={{ uri: user.image }} style={{ width: 64, height: 64 }} />
              : <Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user?.name}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
            <TouchableOpacity onPress={() => user && router.push(`/profile/${user.id}`)} style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: C.accent, fontWeight: '600' }}>Ver perfil publico</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'Activas',      value: active.length },
            { label: 'Vendidas',     value: sold.length },
            { label: 'Calificacion', value: ratingDisplay },
          ].map((stat) => (
            <View key={stat.label} style={s.statBox}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={[s.menuRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.bgBorder }]}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={22} color={C.lavenderMid} />
              <Text style={s.menuLabel}>{item.label}</Text>
              {item.badge ? (
                <View style={s.menuBadge}>
                  <Text style={s.menuBadgeTxt}>{item.badge > 99 ? '99+' : item.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={C.bgBorder} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {active.length > 0 && (
          <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
            <Text style={s.sectionTitle}>Mis publicaciones activas ({active.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {active.slice(0, 6).map((l) => <ListingCard key={l.id} listing={l} />)}
            </View>
          </View>
        )}

        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={s.logoutTxt}>Cerrar sesion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.bgDeep },
  center:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title:         { fontSize: 20, fontWeight: '700', color: C.lavender, marginTop: 16 },
  subtitle:      { fontSize: 14, color: C.lavenderMid, textAlign: 'center', marginTop: 8 },
  cta:           { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 20 },
  ctaTxt:        { color: C.white, fontWeight: '700', fontSize: 15 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: C.bgElevated, borderBottomWidth: 1, borderBottomColor: C.bgBorder },
  avatarWrap:    { width: 64, height: 64, borderRadius: 32, backgroundColor: C.bgSurface, borderWidth: 2, borderColor: C.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '800', color: C.primary },
  userName:      { fontSize: 20, fontWeight: '800', color: C.lavender },
  userEmail:     { fontSize: 13, color: C.lavenderMid, marginTop: 2 },
  statsRow:      { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
  statBox:       { flex: 1, backgroundColor: C.bgSurface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.bgBorder },
  statValue:     { fontSize: 20, fontWeight: '800', color: C.lavender },
  statLabel:     { fontSize: 11, color: C.lavenderMid, marginTop: 2 },
  menu:          { backgroundColor: C.bgSurface, marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: C.bgBorder, overflow: 'hidden' },
  menuRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  menuLabel:     { flex: 1, fontSize: 15, color: C.lavender },
  menuBadge:     { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  menuBadgeTxt:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: C.lavender },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, borderWidth: 1, borderColor: C.bgBorder, borderRadius: 14, paddingVertical: 14 },
  logoutTxt:     { color: C.error, fontWeight: '700', fontSize: 15 },
});
