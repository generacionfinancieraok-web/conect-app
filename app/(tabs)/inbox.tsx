import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { conversationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { timeAgo } from '@/lib/utils';

export default function InboxScreen() {
  const { isAuthenticated, user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await conversationsApi.getAll();
      setConversations(data.conversations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchConversations();
    else setLoading(false);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="chatbubbles-outline" size={56} color="#d1d5db" />
        <Text className="text-xl font-bold text-gray-800 mt-4">Tus mensajes</Text>
        <Text className="text-gray-400 text-center mt-2 mb-6">
          Ingresá para ver tus conversaciones con vendedores
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Mensajes</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563eb" size="large" className="mt-12" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerClassName="py-2"
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 font-medium mt-3">No tenés conversaciones aún</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Cuando contactes a un vendedor, aparecerá acá
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)')}
                className="mt-5 bg-blue-600 rounded-xl py-3 px-6"
              >
                <Text className="text-white font-bold">Explorar artículos</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: conv }) => {
            const other = conv.participants.find((p: any) => p.id !== user?.id);
            const lastMsg = conv.messages[0];
            const listingImg = conv.listing.images[0]?.url;

            return (
              <TouchableOpacity
                onPress={() => router.push(`/chat/${conv.id}`)}
                className="flex-row items-center gap-3 bg-white mx-3 my-1 p-3.5 rounded-2xl border border-gray-100"
                activeOpacity={0.75}
              >
                {/* Thumbnail listing */}
                <View className="relative">
                  <View className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden">
                    {listingImg ? (
                      <Image
                        source={{ uri: listingImg }}
                        style={{ width: 56, height: 56 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-xl">📦</Text>
                      </View>
                    )}
                  </View>
                  {/* Avatar del otro usuario */}
                  <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white bg-blue-100 overflow-hidden items-center justify-center">
                    {other?.image ? (
                      <Image source={{ uri: other.image }} style={{ width: 24, height: 24 }} />
                    ) : (
                      <Text className="text-blue-600 text-xs font-bold">
                        {other?.name?.[0]?.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="font-semibold text-gray-900 flex-1" numberOfLines={1}>
                      {other?.name}
                    </Text>
                    {lastMsg && (
                      <Text className="text-xs text-gray-400 ml-2 shrink-0">
                        {timeAgo(lastMsg.createdAt)}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                    {conv.listing.title}
                  </Text>
                  {lastMsg && (
                    <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                      {lastMsg.sender.id === user?.id ? 'Vos: ' : ''}
                      {lastMsg.body}
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
