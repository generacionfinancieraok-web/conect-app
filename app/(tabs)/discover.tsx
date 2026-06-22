import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, Animated,
  PanResponder, ActivityIndicator, StyleSheet, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { discoverApi, favoritesApi, conversationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatPrice, CONDITION_LABEL } from '@/lib/utils';
import { C, BTN_GRADIENT } from '@/constants/colors';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.35;
const ROTATION_FACTOR = 12;

const CONDITION_DOT: Record<string, string> = {
  NEW: '#3B82F6', LIKE_NEW: '#22C55E', GOOD: '#F59E0B', FAIR: '#F97316', POOR: '#EF4444',
};

const DISMISS_REASONS = [
  { key: 'VERY_EXPENSIVE',  label: 'Muy caro',       icon: '💸' },
  { key: 'NOT_INTERESTED',  label: 'No me interesa', icon: '🙅' },
  { key: 'ALREADY_HAVE',    label: 'Ya lo tengo',    icon: '✅' },
  { key: 'TOO_FAR',         label: 'Muy lejos',      icon: '📍' },
] as const;

type DismissReason = typeof DISMISS_REASONS[number]['key'];

interface ToastState {
  visible: boolean;
  listingId: string;
  listingTitle: string;
  timer: ReturnType<typeof setTimeout> | null;
}

export default function DiscoverScreen() {
  const { isAuthenticated } = useAuthStore();
  const [cards, setCards]           = useState<any[]>([]);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [loading, setLoading]       = useState(true);
  const [outOfCards, setOutOfCards] = useState(false);

  // Cold start
  const [isColdStart, setIsColdStart]       = useState(false);
  const [coldStartTotal, setColdStartTotal] = useState<number | null>(null);
  const [seenCount, setSeenCount]           = useState(0);

  // Toast (undo dismiss)
  const [toast, setToast] = useState<ToastState>({
    visible: false, listingId: '', listingTitle: '', timer: null,
  });

  // Reason bottom sheet
  const [reasonSheet, setReasonSheet]         = useState<{ visible: boolean; listing: any | null }>({ visible: false, listing: null });
  const [pendingDismissListing, setPending]   = useState<any | null>(null);

  // Animated values
  const pan         = useRef(new Animated.ValueXY()).current;
  const toastAnim   = useRef(new Animated.Value(0)).current;
  const [actionHint, setActionHint] = useState<'like' | 'nope' | null>(null);

  const loadFeed = useCallback(async (p = 1) => {
    try {
      const res = await discoverApi.getFeed(p);
      setCards((prev) => (p === 1 ? res.listings : [...prev, ...res.listings]));
      setHasMore(res.hasMore);
      setPage(p);
      if (p === 1) {
        setIsColdStart(res.isColdStart);
        setColdStartTotal(res.coldStartTotal);
        setSeenCount(0);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(1); }, []);

  useEffect(() => {
    if (cards.length <= 2 && hasMore && !loading) loadFeed(page + 1);
    if (cards.length === 0 && !hasMore && !loading) setOutOfCards(true);
  }, [cards.length]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const showToast = useCallback((listingId: string, listingTitle: string) => {
    setToast((prev) => {
      if (prev.timer) clearTimeout(prev.timer);
      return { visible: true, listingId, listingTitle, timer: null };
    });
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setToast({ visible: false, listingId: '', listingTitle: '', timer: null })
      );
    }, 3500);
    setToast((prev) => ({ ...prev, timer }));
  }, [toastAnim]);

  const handleUndo = useCallback(async () => {
    setToast((prev) => {
      if (prev.timer) clearTimeout(prev.timer);
      return { visible: false, listingId: '', listingTitle: '', timer: null };
    });
    if (toast.listingId) {
      try { await discoverApi.undoDismiss(toast.listingId); } catch {}
      // Reload to put the card back
      setLoading(true);
      loadFeed(1);
    }
  }, [toast.listingId, loadFeed]);

  // ── Dismiss flow ───────────────────────────────────────────────────────────
  const dismissTopRef = useRef<(dir: 'left' | 'right') => void>(() => {});

  const dismissTop = useCallback(async (direction: 'left' | 'right', reason?: DismissReason) => {
    if (!cards.length) return;
    const top = cards[0];

    Animated.timing(pan, {
      toValue: { x: direction === 'right' ? W * 1.5 : -W * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      pan.setValue({ x: 0, y: 0 });
      setActionHint(null);
      setCards((prev) => prev.slice(1));
      setSeenCount((n) => n + 1);

      if (direction === 'right') {
        if (isAuthenticated) {
          try { await favoritesApi.toggle(top.id); } catch {}
        }
      } else {
        if (isAuthenticated) {
          try { await discoverApi.dismiss(top.id, reason); } catch {}
          showToast(top.id, top.title);
        }
      }
    });
  }, [cards, isAuthenticated, pan, showToast]);

  useEffect(() => { dismissTopRef.current = dismissTop; }, [dismissTop]);

  // Left swipe → show reason sheet, then dismiss
  const initiateLeftSwipe = useCallback((listing: any) => {
    setPending(listing);
    setReasonSheet({ visible: true, listing });
  }, []);

  const confirmDismiss = useCallback(async (reason?: DismissReason) => {
    setReasonSheet({ visible: false, listing: null });
    // Small delay so sheet closes smoothly before card flies off
    setTimeout(() => dismissTop('left', reason), 150);
  }, [dismissTop]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        pan.setValue({ x: gs.dx, y: gs.dy });
        if (gs.dx > SWIPE_THRESHOLD * 0.5)       setActionHint('like');
        else if (gs.dx < -SWIPE_THRESHOLD * 0.5) setActionHint('nope');
        else                                      setActionHint(null);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          dismissTopRef.current('right');
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          // Snap back first, then show reason sheet
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
          setActionHint(null);
          // Need to access cards[0] — use a ref-based approach
          swipeLeftRequestRef.current = true;
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
          setActionHint(null);
        }
      },
    })
  ).current;

  // Ref to signal that a left-swipe was requested (so we can access latest cards)
  const swipeLeftRequestRef = useRef(false);
  useEffect(() => {
    if (swipeLeftRequestRef.current && cards.length > 0) {
      swipeLeftRequestRef.current = false;
      initiateLeftSwipe(cards[0]);
    }
  });

  const rotate = pan.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: [`-${ROTATION_FACTOR}deg`, '0deg', `${ROTATION_FACTOR}deg`],
    extrapolate: 'clamp',
  });

  // ── Cold start progress bar ────────────────────────────────────────────────
  const ColdStartBar = () => {
    if (!isColdStart || !coldStartTotal) return null;
    const progress = Math.min(seenCount / coldStartTotal, 1);
    return (
      <View style={s.coldStartBar}>
        <Text style={s.coldStartLabel}>
          Aprendiendo tus gustos · {Math.min(seenCount, coldStartTotal)}/{coldStartTotal}
        </Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    );
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>✨</Text>
        <Text style={s.title}>Descubrir</Text>
        <Text style={s.subtitle}>Iniciá sesión para ver publicaciones recomendadas para vos</Text>
        <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Iniciar sesión</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && cards.length === 0) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[s.subtitle, { marginTop: 16 }]}>Buscando publicaciones para vos…</Text>
      </SafeAreaView>
    );
  }

  if (outOfCards) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🎉</Text>
        <Text style={s.title}>¡Lo viste todo!</Text>
        <Text style={s.subtitle}>Volvé más tarde para encontrar nuevas publicaciones</Text>
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => { setOutOfCards(false); setLoading(true); loadFeed(1); }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Recargar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.loginBtn, { marginTop: 12, backgroundColor: C.bgElevated }]}
          onPress={() => router.push('/discover-history')}
        >
          <Text style={{ color: C.lavenderMid, fontWeight: '600', fontSize: 15 }}>Ver descartados</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const topCard  = cards[0];
  const nextCard = cards[1];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>✨ Descubrir</Text>
          <Text style={s.headerSub}>
            {isColdStart ? 'Calibrando tus recomendaciones' : 'Deslizá para descubrir'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/discover-history')} style={s.historyBtn}>
          <Ionicons name="time-outline" size={20} color={C.lavenderMid} />
          <Text style={s.historyBtnLabel}>Descartados</Text>
        </TouchableOpacity>
      </View>

      {/* Cold start progress */}
      <ColdStartBar />

      {/* Card Stack */}
      <View style={s.deck}>
        {nextCard && (
          <View style={[s.card, s.cardBehind]}>
            <CardContent listing={nextCard} />
          </View>
        )}
        {topCard && (
          <Animated.View
            style={[
              s.card,
              { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
            ]}
            {...panResponder.panHandlers}
          >
            {actionHint === 'like' && (
              <View style={[s.hintOverlay, { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22C55E' }]}>
                <Text style={[s.hintText, { color: '#22C55E' }]}>❤️ GUARDAR</Text>
              </View>
            )}
            {actionHint === 'nope' && (
              <View style={[s.hintOverlay, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#EF4444' }]}>
                <Text style={[s.hintText, { color: '#EF4444' }]}>✕ SALTAR</Text>
              </View>
            )}
            <CardContent listing={topCard} />
          </Animated.View>
        )}
      </View>

      {/* Action Buttons */}
      {topCard && (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: '#EF4444' }]}
            onPress={() => initiateLeftSwipe(topCard)}
          >
            <Ionicons name="close" size={28} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtnLarge, { backgroundColor: C.primary }]}
            onPress={async () => {
              try {
                const { conversation } = await conversationsApi.create(topCard.id);
                dismissTop('right');
                router.push(`/chat/${conversation.id}`);
              } catch {}
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { borderColor: '#22C55E' }]}
            onPress={() => dismissTop('right')}
          >
            <Ionicons name="heart" size={28} color="#22C55E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Toast */}
      {toast.visible && (
        <Animated.View style={[s.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <Text style={s.toastText} numberOfLines={1}>
            Descartado · <Text style={{ color: C.lavenderMid }}>{toast.listingTitle}</Text>
          </Text>
          <TouchableOpacity onPress={handleUndo} style={s.toastUndo}>
            <Text style={s.toastUndoText}>Deshacer</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Reason bottom sheet */}
      <Modal
        visible={reasonSheet.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setReasonSheet({ visible: false, listing: null })}
      >
        <TouchableWithoutFeedback onPress={() => confirmDismiss()}>
          <View style={s.sheetOverlay} />
        </TouchableWithoutFeedback>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>¿Por qué no te interesa?</Text>
          <Text style={s.sheetSubtitle}>Ayudanos a mejorar tus recomendaciones</Text>
          <View style={s.reasonGrid}>
            {DISMISS_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={s.reasonBtn}
                onPress={() => confirmDismiss(r.key)}
              >
                <Text style={s.reasonIcon}>{r.icon}</Text>
                <Text style={s.reasonLabel}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.skipReasonBtn} onPress={() => confirmDismiss()}>
            <Text style={s.skipReasonText}>Omitir</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CardContent({ listing }: { listing: any }) {
  const image = listing.images?.[0]?.url;
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => router.push(`/listing/${listing.id}`)}
      style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}
    >
      <Image
        source={image ? { uri: image } : require('../../assets/placeholder.png')}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(13,11,26,0.92)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={s.conditionBadge}>
        <View style={{
          width: 7, height: 7, borderRadius: 3.5,
          backgroundColor: CONDITION_DOT[listing.condition] ?? '#6B7280',
        }} />
        <Text style={{ color: '#EDE9FE', fontSize: 11, fontWeight: '600' }}>
          {CONDITION_LABEL[listing.condition]}
        </Text>
      </View>
      <View style={s.cardInfo}>
        <Text style={s.cardPrice}>{formatPrice(listing.price, listing.currency)}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{listing.title}</Text>
        <View style={s.sellerRow}>
          <Image
            source={{ uri: listing.user?.image ?? `https://ui-avatars.com/api/?name=${listing.user?.name}&background=6C3DE0&color=fff` }}
            style={{ width: 28, height: 28, borderRadius: 14 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#EDE9FE', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
              {listing.user?.name}
            </Text>
            {listing.user?.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={10} color="#FBBF24" />
                <Text style={{ color: '#A89ED0', fontSize: 11 }}>
                  {listing.user.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          <View style={s.distanceBadge}>
            <Ionicons name="location-outline" size={11} color="#A89ED0" />
            <Text style={{ color: '#A89ED0', fontSize: 11 }}>{listing.city}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_H = H * 0.62;

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.bgDeep },
  center:         { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header:         {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: C.lavender },
  headerSub:      { fontSize: 12, color: C.lavenderDim, marginTop: 2 },
  historyBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.bgElevated, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: C.bgBorder,
  },
  historyBtnLabel:{ color: C.lavenderMid, fontSize: 12, fontWeight: '600' },

  // Cold start
  coldStartBar:   { paddingHorizontal: 20, paddingBottom: 10 },
  coldStartLabel: { color: C.lavenderMid, fontSize: 11, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  progressTrack:  { height: 4, backgroundColor: C.bgElevated, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: '#EC4899', borderRadius: 2 },

  // Cards
  deck:           { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  card:           {
    width: W - 32, height: CARD_H,
    borderRadius: 24, backgroundColor: C.bgSurface, position: 'absolute',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  cardBehind:     { transform: [{ scale: 0.94 }, { translateY: 16 }] },
  hintOverlay:    {
    position: 'absolute', top: 20, left: 20, right: 20,
    paddingVertical: 10, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', zIndex: 10,
  },
  hintText:       { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  conditionBadge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,11,26,0.82)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  cardInfo:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  cardPrice:      { fontSize: 26, fontWeight: '800', color: '#EC4899', marginBottom: 4 },
  cardTitle:      { fontSize: 17, fontWeight: '700', color: '#EDE9FE', marginBottom: 12, lineHeight: 22 },
  sellerRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distanceBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Actions
  actions:        {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, paddingVertical: 20, paddingHorizontal: 24,
  },
  actionBtn:      {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  actionBtnLarge: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },

  // Toast
  toast: {
    position: 'absolute', bottom: 110, left: 20, right: 20,
    backgroundColor: '#1E1A35',
    borderRadius: 16, borderWidth: 1, borderColor: C.bgBorder,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  toastText:      { flex: 1, color: C.lavender, fontSize: 14, fontWeight: '600' },
  toastUndo:      { paddingLeft: 12 },
  toastUndoText:  { color: '#EC4899', fontWeight: '800', fontSize: 14 },

  // Reason sheet
  sheetOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:          {
    backgroundColor: C.bgSurface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
  },
  sheetHandle:    {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.bgBorder, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle:     { fontSize: 18, fontWeight: '800', color: C.lavender, textAlign: 'center' },
  sheetSubtitle:  { fontSize: 13, color: C.lavenderDim, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  reasonGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  reasonBtn:      {
    width: (W - 48 - 12) / 2,
    backgroundColor: C.bgElevated,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.bgBorder,
  },
  reasonIcon:     { fontSize: 28 },
  reasonLabel:    { color: C.lavender, fontWeight: '700', fontSize: 14 },
  skipReasonBtn:  { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  skipReasonText: { color: C.lavenderDim, fontSize: 14 },

  // Generic
  title:          { fontSize: 22, fontWeight: '800', color: C.lavender, marginBottom: 12, textAlign: 'center' },
  subtitle:       { fontSize: 14, color: C.lavenderMid, textAlign: 'center', lineHeight: 20 },
  loginBtn:       {
    marginTop: 24, backgroundColor: C.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
  },
});
