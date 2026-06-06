import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { conversationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { timeAgo } from '@/lib/utils';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string | null; image: string | null };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [convInfo, setConvInfo] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await conversationsApi.getMessages(id);
      setMessages(data.messages);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();

    // Socket.io
    const socket = io(process.env.EXPO_PUBLIC_SOCKET_URL || '', {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('join_conversation', id);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setOtherTyping(true);
        setTimeout(() => setOtherTyping(false), 2000);
      }
    });

    return () => {
      socket.emit('leave_conversation', id);
      socket.disconnect();
    };
  }, [id]);

  // Actualizar título del header con el nombre del otro usuario
  useEffect(() => {
    if (convInfo) {
      const other = convInfo.participants?.find((p: any) => p.id !== user?.id);
      navigation.setOptions({ title: other?.name || 'Chat' });
    }
  }, [convInfo]);

  function handleTyping() {
    socketRef.current?.emit('typing', { conversationId: id, userId: user?.id });
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput('');
    setSending(true);
    try {
      await conversationsApi.sendMessage(id, body);
    } catch (e) {
      setInput(body); // restaurar si falló
    } finally {
      setSending(false);
    }
  }

  const renderMessage = ({ item: msg }: { item: Message }) => {
    const isMe = msg.senderId === user?.id;
    return (
      <View className={`flex-row items-end gap-2 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && (
          <View className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden items-center justify-center mb-1">
            {msg.sender.image ? (
              <Image source={{ uri: msg.sender.image }} style={{ width: 28, height: 28 }} />
            ) : (
              <Text className="text-xs font-bold text-gray-500">{msg.sender.name?.[0]}</Text>
            )}
          </View>
        )}
        <View className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
          <View
            className={`px-4 py-2.5 rounded-2xl ${
              isMe
                ? 'bg-blue-600 rounded-tr-sm'
                : 'bg-white border border-gray-100 rounded-tl-sm shadow-sm'
            }`}
          >
            <Text className={`text-base leading-snug ${isMe ? 'text-white' : 'text-gray-800'}`}>
              {msg.body}
            </Text>
          </View>
          <Text className="text-xs text-gray-400 mt-1 px-1">
            {timeAgo(msg.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <ActivityIndicator color="#2563eb" size="large" className="flex-1" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerClassName="px-4 pt-4 pb-2"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            otherTyping ? (
              <View className="flex-row items-end gap-2 mb-2">
                <View className="w-7 h-7 rounded-full bg-gray-200" />
                <View className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <View className="flex-row gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <View key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-gray-100 px-3 py-2">
        <View className="flex-row items-end gap-2">
          <TextInput
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base text-gray-900 max-h-28"
            placeholder="Escribí un mensaje..."
            value={input}
            onChangeText={(v) => { setInput(v); handleTyping(); }}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              input.trim() ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <Ionicons name="send" size={18} color={input.trim() ? '#fff' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
