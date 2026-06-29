import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  FlatList, Alert, ActivityIndicator, Share, Modal, StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { listingsApi, conversationsApi, favoritesApi, reportsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatPrice, timeAgo, CONDITION_LABEL } from '@/lib/utils';
import { C, BTN_GRADIENT } from '@/constants/colors';

const { width } = Dimensions.get('window');

const REPORT_REASONS = [
  'Producto falso o engañoso', 'Precio abusivo', 'Contenido inapropiado',
  'Spam o publicidad', 'Producto prohibido', 'Otra razón',
];

// Traffic-light colors for condition badge
const CONDITION_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  NEW:      { bg: '#1E3A5F', border: '#3B82F6', text: '#93C5FD' },
  LIKE_NEW: { bg: '#14532D', border: '#22C55E', text: '#86EFAC' },
  GOOD:     { bg: '#451A03', border: '#F59E0B', text: '#FCD34D' },
  FAIR:     { bg: '#431407', border: '#F97316', text: '#FDBA74' },
  POOR:     { bg: '#450A0A', border: '#EF4444', text: '#FCA5A5' },
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const data = await listingsApi.getById(id);
      setListing(data.listing);
      setFavorited(data.listing?.isFavorited ?? false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setFavLoading(true);
    try {
      const { favorited: newVal } = await favoritesApi.toggle(id);
      setFavorited(newVal);
    } catch {}
    setFavLoading(false);
  };

  const handleContact = async () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setContactLoading(true);
    try {
      const { conversation } = await conversationsApi.create(id);
      router.push(`/chat/${conversation.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setContactLoading(false);
  };

  const handleOffer = () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    router.push({
      pathname: '/listing/make-offer',
      params: { listingId: id, listingTitle: listing.title, listingPrice: String(listing.price) },
    });
  };

  const handleShare = async () => {
    await Share.share({ message: `${listing.title} - ${formatPrice(listing.price, listing.currency)} en Conect App` });
  };

  const handleReport = () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setReportVisible(true);
  };

  const submitReport = async (reason: string) => {
    setReportVisible(false);
    try {
      await reportsApi.create(reason, undefined, id);
      Alert.alert('Reporte enviado', 'Gracias por ayudarnos.');
    } catch {}
  };

  const isOwner = user?.id === listing?.userId;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }
  if (!listing) return null;

  const images = listing.images ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bgDeep }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.lavender} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.headerBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={C.lavender} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={handleFavorite} disabled={favLoading}>
            <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? C.accent : C.lavender} />
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity style={s.headerBtn} onPress={handleReport}>
              <Ionicons name="flag-outline" size={22} color={C.lavender} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Carousel */}
        <View style={{ height: width * 0.85 }}>
          <FlatList
            data={images.length ? images : [{ url: null }]}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Image
                source={item.url ? { uri: item.url } : require('../../assets/placeholder.png')}
                style={{ width, height: width * 0.85 }}
                contentFit="cover"
              />
            )}
            keyExtractor={(_, i) => String(i)}
          />
          {images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
              {images.map((_: any, i: number) => (
                <View key={i} style={{
                  borderRadius: 4, height: 6,
                  width: i === imageIndex ? 16 : 6,
                  backgroundColor: i === imageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                }} />
              ))}
            </View>
          )}
          {listing.promoted && (
            <View style={s.promotedBadge}>
              <Ionicons name="star" size={11} color="white" />
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Destacado</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 16 }}>
          {/* Price + condition */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: C.accent }}>
                {formatPrice(listing.price, listing.currency)}
              </Text>
              {listing.status === 'SOLD' && (
                <View style={s.soldBadge}>
                  <Text style={{ color: '#FCA5A5', fontWeight: '700', fontSize: 13 }}>Vendido</Text>
                </View>
              )}
            </View>
            <View style={[s.conditionBadge, {
              backgroundColor: CONDITION_COLOR[listing.condition]?.bg ?? C.bgSurface,
              borderColor: CONDITION_COLOR[listing.condition]?.border ?? C.bgBorder,
            }]}>
              <Text style={{ color: CONDITION_COLOR[listing.condition]?.text ?? C.lavenderMid, fontWeight: '700', fontSize: 13 }}>
                {CONDITION_LABEL[listing.condition]}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: C.lavender, marginBottom: 4 }}>
            {listing.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <Ionicons name="location-outline" size={13} color={C.lavenderDim} />
            <Text style={{ color: C.lavenderDim, fontSize: 13 }}>
              {listing.city}, {listing.province} · {timeAgo(listing.createdAt)}
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="eye-outline" size={15} color={C.lavenderDim} />
              <Text style={{ color: C.lavenderDim, fontSize: 13 }}>{listing.views} vistas</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="heart-outline" size={15} color={C.lavenderDim} />
              <Text style={{ color: C.lavenderDim, fontSize: 13 }}>{listing.saves} guardados</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={s.sectionLabel}>Descripción</Text>
          <Text style={{ color: C.lavenderMid, lineHeight: 22, marginBottom: 20 }}>{listing.description}</Text>

          {/* Category */}
          <View style={[s.divider, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Text style={{ fontSize: 24 }}>{listing.category?.icon ?? '📦'}</Text>
            <Text style={{ color: C.lavenderMid }}>{listing.category?.name}</Text>
          </View>

          {/* Seller */}
          <TouchableOpacity style={[s.divider, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
            onPress={() => router.push(`/profile/${listing.userId}`)}>
            <Image
              source={{ uri: listing.user?.image ?? `https://ui-avatars.com/api/?name=${listing.user?.name}&background=6C3DE0&color=fff` }}
              style={{ width: 52, height: 52, borderRadius: 26 }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontWeight: '700', color: C.lavender }}>{listing.user?.name}</Text>
                {listing.user?.isVerified && (
                  <View style={s.verifiedBadge}>
                    <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700' }}>✓ Verificado</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={{ color: C.lavenderDim, fontSize: 13 }}>
                  {listing.user?.rating?.toFixed(1) ?? '—'} ({listing.user?.ratingCount ?? 0} reseñas)
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.bgBorder} />
          </TouchableOpacity>

          {/* Owner actions */}
          {isOwner && (
            <View style={{ gap: 10, marginBottom: 8 }}>
              <TouchableOpacity style={s.ownerBtn} onPress={() => router.push({ pathname: '/listing/edit', params: { id } })}>
                <Ionicons name="create-outline" size={20} color="#6C3DE0" />
                <Text style={{ color: '#6C3DE0', fontWeight: '600' }}>Editar publicación</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ownerBtn} onPress={() => router.push({ pathname: '/listing/stats', params: { id } })}>
                <Ionicons name="bar-chart-outline" size={20} color={C.primary} />
                <Text style={{ color: C.primary, fontWeight: '600' }}>Ver estadísticas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ownerBtn} onPress={() => router.push('/offers')}>
                <Ionicons name="pricetag-outline" size={20} color={C.accent} />
                <Text style={{ color: C.accent, fontWeight: '600' }}>Ver ofertas recibidas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA — bottom padding adapts to device safe area */}
      {!isOwner && listing.status === 'ACTIVE' && (
        <View style={[s.cta, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <TouchableOpacity style={s.offerBtn} onPress={handleOffer}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 15 }}>Hacer oferta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 16, overflow: 'hidden', opacity: contactLoading ? 0.7 : 1 }}
            onPress={handleContact} disabled={contactLoading}
          >
            <LinearGradient colors={BTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
              {contactLoading
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Contactar</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Modal — replaces Alert so Cancel is always visible */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setReportVisible(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Reportar publicación</Text>
            <Text style={s.modalSub}>¿Por qué querés reportarla?</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity key={reason} style={s.modalOption} onPress={() => submitReport(reason)}>
                <Text style={s.modalOptionTxt}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancel} onPress={() => setReportVisible(false)}>
              <Text style={s.modalCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bgElevated, borderBottomWidth: 1, borderBottomColor: C.bgBorder },
  headerBtn:    { width: 38, height: 38, borderRadius: 10, backgroundColor: C.bgSurface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.bgBorder },
  promotedBadge:{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  soldBadge:    { backgroundColor: '#7F1D1D40', borderWidth: 1, borderColor: '#EF444440', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 6 },
  conditionBadge:{ backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.bgBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statsRow:     { flexDirection: 'row', gap: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: C.lavender, marginBottom: 8, marginTop: 4 },
  divider:      { paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.bgBorder, marginBottom: 4 },
  verifiedBadge:{ backgroundColor: C.bgDeep, borderWidth: 1, borderColor: C.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  ownerBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.bgBorder },
  cta:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.bgElevated, borderTopWidth: 1, borderTopColor: C.bgBorder },
  offerBtn:     { flex: 1, borderWidth: 1.5, borderColor: C.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, borderWidth: 1, borderColor: C.bgBorder },
  modalHandle:  { width: 40, height: 4, backgroundColor: C.bgBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: C.lavender, marginBottom: 4 },
  modalSub:     { fontSize: 14, color: C.lavenderDim, marginBottom: 16 },
  modalOption:  { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bgBorder },
  modalOptionTxt:{ fontSize: 15, color: C.lavender },
  modalCancel:  { marginTop: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: C.bgSurface, alignItems: 'center', borderWidth: 1, borderColor: C.bgBorder },
  modalCancelTxt:{ fontSize: 15, fontWeight: '700', color: C.lavenderDim },
});