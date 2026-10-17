import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ChatMessage } from '../types/chat';
import {
  subscribeToTeamMessages,
  sendTeamMessage,
  setUserTypingStatus,
  subscribeToTeamTyping,
} from '../services/chatService';

interface ChatScreenProps {
  route: any;
  navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { teamId, teamName } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToTeamMessages(
      teamId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error('Chat error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamId]);

  // Subscribe to real-time typing indicators
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeTyping = subscribeToTeamTyping(teamId, user.id, (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubscribeTyping();
      setUserTypingStatus(teamId, { id: user.id, name: user.name || 'User' }, false);
    };
  }, [teamId, user]);

  // Scroll to bottom when new messages arrive or someone is typing
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, typingUsers.length]);

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (user?.id) {
      setUserTypingStatus(teamId, { id: user.id, name: user.name || 'User' }, true);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        setUserTypingStatus(teamId, { id: user.id, name: user.name || 'User' }, false);
      }, 2500);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !user || sending) return;

    try {
      setSending(true);
      setInputText('');

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      setUserTypingStatus(teamId, { id: user.id, name: user.name || 'User' }, false);

      await sendTeamMessage({
        teamId,
        senderId: user.id,
        senderName: user.name || user.email.split('@')[0],
        senderAvatarUrl: user.avatarUrl || null,
        text,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {teamName}
            </Text>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  typingUsers.length > 0 && styles.statusDotTyping,
                ]}
              />
              <Text style={styles.statusText}>
                {typingUsers.length > 0
                  ? `${typingUsers[0]} is typing...`
                  : 'Real-Time Active'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightBadge}>
            <Ionicons name="chatbubbles" size={18} color={COLORS.primary} />
          </View>
        </View>

        {/* Message List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Connecting to team chat...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChatContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={38} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Start the Conversation</Text>
                <Text style={styles.emptySubtitle}>
                  Send a message to collaborate with your team members in real-time.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.senderId === user?.id;

              return (
                <View style={[styles.messageRow, isMine ? styles.myRow : styles.otherRow]}>
                  {!isMine && (
                    <View style={styles.senderAvatar}>
                      {item.senderAvatarUrl ? (
                        <Image source={{ uri: item.senderAvatarUrl }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarLetter}>{getInitials(item.senderName)}</Text>
                      )}
                    </View>
                  )}

                  <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
                    {!isMine && (
                      <Text style={styles.senderNameLabel} numberOfLines={1}>
                        {item.senderName}
                      </Text>
                    )}

                    <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
                      {item.text}
                    </Text>

                    <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.otherTimestamp]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>

                  {isMine && (
                    <View style={styles.myAvatar}>
                      {user?.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarLetterWhite}>{getInitials(user?.name)}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Real-time Typing Indicator Bar */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            <View style={styles.typingDotsRow}>
              <View style={styles.smallDot} />
              <View style={styles.smallDot} />
              <View style={styles.smallDot} />
            </View>
            <Text style={styles.typingLabel}>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.join(', ')} are typing...`}
            </Text>
          </View>
        )}

        {/* Bottom Message Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusDotTyping: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerRightBadge: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyChatContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  myAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarLetter: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  avatarLetterWhite: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  typingLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  senderNameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: COLORS.textDark,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherTimestamp: {
    color: COLORS.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textDark,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
});
