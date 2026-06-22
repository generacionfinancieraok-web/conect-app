import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { discoverApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { C } from '@/constants/colors';

const REASON_LABEL: Record<string, string> = {
  VERY_EXPENSIVE:  '💸 Muy caro',
  NOT_INTERESTED:  '🙅 No me interesa',
  ALREADY_HAVE:    '✅ Ya lo tengo',
  TOO_FAR:         '📍 Muy lejos',
};

export default function DiscoverHistoryScreen() {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { dismissed } = await discoverApi.getHistory();
      setItems(dismissed);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const handleUndo = async (listingId: string) => {
    try {
      await discoverApi.undoDismiss(listingId);
      setItems((prev) => prev.filter((d) => d.listing.id !== listingId));
    } catch {}
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.lavender} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Publicaciones descartadas</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🗑️</Text>
          <Text style={s.emptyTitle}>Sin descartados</Text>
          <Text style={s.emptySubtitle}>Las publicaciones que omitís aparecen acá</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(d) => d.dismissId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const listing = item.listing;
            const image   = listing?.images?.[0]?.url;
            return (
              <View style={s.card}>
                {/* Thumbnail */}
                <TouchableOpacity
                  onPress={() => router.push(`/listing/${listing.id}`)}
                  style={s.thumb}
                >
                  <Image
                    source={image ? { uri: image } : require('../assets/placeholder.png')}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    contentFit="cover"
                  />
                  {item.reactivated && (
                    <View style={s.reactivatedBadge}>
                      <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>PRECIO ↓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Info */}
                <View style={s.info}>
                  <Text style={s.title} numberOfLines={2}>{listing?.title}</Text>
                  <Text style={s.price}>{formatPrice(listing?.price, listing?.currency)}</Text>
                  {item.reason && (
                    <View style={s.reasonBadge}>
                      <Text style={s.reasonText}>{REASON_LABEL[item.reason] ?? item.reason}</Text>
                    </View>
                  )}
                  <Text style={s.date}>
                    {new Date(item.dismissedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>

                {/* Undo */}
                <TouchableOpacity
                  style={s.undoBtn}
                  onPress={() => handleUndo(listing.id)}
                >
                  <Ionicons name="arrow-undo" size={18} color={C.primary} />
                  <Text style={s.undoText}>Restaurar</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: C.bgDeep },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:           {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.bgBorder,
  },
  backBtn:          {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:      { fontSize: 16, fontWeight: '800', color: C.lavender },
  emptyTitle:       { fontSize: 18, fontWeight: '800', color: C.lavender, marginBottom: 8 },
  emptySubtitle:    { fontSize: 14, color: C.lavenderMid, textAlign: 'center' },
  card:             {
    backgroundColor: C.bgSurface, borderRadius: 18,
    borderWidth: 1, borderColor: C.bgBorder,
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  thumb:            { width: 72, height: 72, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  reactivatedBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#10B981', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  info:             { flex: 1, gap: 4 },
  title:            { fontSize: 14, fontWeight: '700', color: C.lavender, lineHeight: 18 },
  price:            { fontSize: 15, fontWeight: '800', color: '#EC4899' },
  reasonBadge:      {
    backgroundColor: C.bgElevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  reasonText:       { fontSize: 11, color: C.lavenderMid, fontWeight: '600' },
  date:             { fontSize: 11, color: C.lavenderDim },
  undoBtn:          { alignItems: 'center', gap: 4, paddingLeft: 8 },
  undoText:         { fontSize: 10, color: C.primary, fontWeight: '700' },
});
