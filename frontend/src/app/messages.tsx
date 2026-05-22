import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useColorScheme,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from '@/components/symbol-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset } from '@/constants/theme';
import { useAuth, API_URL } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';



interface Participant {
  _id: string;
  username: string;
  profilePic: string;
}

interface ChatRoom {
  _id: string;
  participants: Participant[];
  type: string;
  name?: string;
  lastMessage?: {
    text?: string;
    createdAt: string;
    sender: string;
  };
  updatedAt: string;
}

interface Message {
  _id: string;
  chatRoom: string;
  sender: Participant;
  text: string;
  mediaUrl?: string;
  readBy: string[];
  createdAt: string;
}

export default function MessagesScreen() {
  const { token, user: currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const { socket, isConnected } = useSocket();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const safeAreaInsets = useSafeAreaInsets();

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  
  // Selected Chat state
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');

  // Search user to start new chat
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  
  const scrollRef = useRef<any>(null);

  const fetchChats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.warn('Failed to load chat listing:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [token]);

  // Handle Socket Events inside Selected Room
  useEffect(() => {
    if (!socket || !selectedChat) return;

    // Join room channel
    socket.emit('join_room', selectedChat._id);

    // Read initial mark
    socket.emit('mark_read', { chatRoomId: selectedChat._id, userId: currentUser?._id });

    const handleMessageReceived = (newMessage: Message) => {
      if (newMessage.chatRoom === selectedChat._id) {
        setMessages((prev) => [...prev, newMessage]);
        // Trigger read tick update back to peer
        socket.emit('mark_read', { chatRoomId: selectedChat._id, userId: currentUser?._id });
        // Scroll to end
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
      // Re-fetch chat list order
      fetchChats();
    };

    const handleTyping = (room: string) => {
      if (room === selectedChat._id) {
        setPeerTyping(true);
      }
    };

    const handleStopTyping = (room: string) => {
      if (room === selectedChat._id) {
        setPeerTyping(false);
      }
    };

    const handleMarkedRead = () => {
      // Refresh to see double ticks
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.readBy.includes(currentUser?._id || '')) {
            return { ...msg, readBy: [...msg.readBy, currentUser?._id || ''] };
          }
          return msg;
        })
      );
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('messages_marked_read', handleMarkedRead);

    // Alert server if chat listing refreshes in background
    socket.on('chat_list_updated', () => {
      fetchChats();
    });

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('messages_marked_read', handleMarkedRead);
    };
  }, [socket, selectedChat]);

  const loadMessages = async (chat: ChatRoom) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    setPeerTyping(false);
    try {
      const response = await fetch(`${API_URL}/api/chats/${chat._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
      }
    } catch (err) {
      console.warn('Failed to load room history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = () => {
    if (!socket || !selectedChat || !typedMessage.trim()) return;

    socket.emit('stop_typing', selectedChat._id);
    setIsTyping(false);

    const messagePayload = {
      chatRoomId: selectedChat._id,
      senderId: currentUser?._id,
      text: typedMessage,
    };

    socket.emit('new_message', messagePayload);
    setTypedMessage('');
  };

  // Typing event emits
  const handleTypingText = (text: string) => {
    setTypedMessage(text);
    if (!socket || !selectedChat) return;

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true);
      socket.emit('typing', selectedChat._id);
    } else if (isTyping && text.trim().length === 0) {
      setIsTyping(false);
      socket.emit('stop_typing', selectedChat._id);
    }
  };

  // Start new direct chat
  useEffect(() => {
    if (!userQuery.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`${API_URL}/api/users/search?q=${userQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserResults(data);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery, token]);

  const startNewChat = async (targetId: string) => {
    setShowSearchModal(false);
    setUserQuery('');
    setUserResults([]);

    try {
      const response = await fetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId: targetId }),
      });

      if (response.ok) {
        const room = await response.json();
        // Insert room into chats listing if missing
        if (!chats.find((c) => c._id === room._id)) {
          setChats((prev) => [room, ...prev]);
        }
        loadMessages(room);
      }
    } catch (err) {
      console.warn('Start chat error:', err);
    }
  };

  const getChatPartner = (chat: ChatRoom) => {
    return chat.participants.find((p) => p._id !== currentUser?._id) || {
      username: 'Ghost User',
      profilePic: '',
    };
  };

  const insetsStyle = {
    paddingTop: Platform.OS === 'web' ? 90 : safeAreaInsets.top,
  };

  const isDark = scheme === 'dark';
  const showMobileSplit = width < 768;
  
  // Decide what to render based on split view
  const renderSidebar = !showMobileSplit || !selectedChat;
  const renderChatActive = !showMobileSplit || !!selectedChat;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.chatDashboard, insetsStyle]}>
        
        {/* Left Side: Chats List */}
        {renderSidebar && (
          <View style={[styles.sidebar, { borderRightColor: theme.backgroundElement }]}>
            <View style={styles.sidebarHeader}>
              <ThemedText type="subtitle">Chats</ThemedText>
              <TouchableOpacity
                onPress={() => setShowSearchModal(true)}
                style={[styles.newChatBtn, { backgroundColor: '#4F46E5' }]}
              >
                <SymbolView tintColor="#ffffff" name="plus" size={16} />
              </TouchableOpacity>
            </View>

            {loadingChats ? (
              <ActivityIndicator style={{ marginTop: Spacing.four }} size="small" color="#4F46E5" />
            ) : chats.length === 0 ? (
              <View style={styles.emptyChatsList}>
                <SymbolView tintColor={theme.textSecondary} name="bubble.left.and.bubble.right" size={32} />
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one }}>
                  No active conversations yet.{'\n'}Click the "+" icon to start.
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {chats.map((chat) => {
                  const partner = getChatPartner(chat);
                  const isActive = selectedChat?._id === chat._id;
                  return (
                    <TouchableOpacity
                      key={chat._id}
                      onPress={() => loadMessages(chat)}
                      style={[
                        styles.chatRow,
                        {
                          backgroundColor: isActive ? theme.backgroundSelected : 'transparent',
                        },
                      ]}
                    >
                      <Image
                        source={partner.profilePic ? { uri: partner.profilePic } : 'https://picsum.photos/id/1025/100/100'}
                        style={styles.chatAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">{partner.username}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {chat.lastMessage?.text || 'No messages yet.'}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Right Side: Conversation Area */}
        {renderChatActive && (
          <View style={styles.chatPane}>
            {selectedChat ? (
              <View style={{ flex: 1 }}>
                
                {/* Active Chat Header */}
                <View style={[styles.chatPaneHeader, { borderBottomColor: theme.backgroundElement }]}>
                  {showMobileSplit && (
                    <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backBtn}>
                      <SymbolView tintColor={theme.text} name="chevron.left" size={20} />
                    </TouchableOpacity>
                  )}

                  <Image
                    source={
                      getChatPartner(selectedChat).profilePic
                        ? { uri: getChatPartner(selectedChat).profilePic }
                        : 'https://picsum.photos/id/1025/100/100'
                    }
                    style={styles.paneAvatar}
                  />
                  <View>
                    <ThemedText type="smallBold">{getChatPartner(selectedChat).username}</ThemedText>
                    {peerTyping ? (
                      <ThemedText type="small" style={{ color: '#4F46E5', fontSize: 11 }}>
                        typing...
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                        {isConnected ? 'online' : 'offline'}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {/* Messages Log Container */}
                {loadingMessages ? (
                  <ActivityIndicator style={{ flex: 1 }} size="small" color="#4F46E5" />
                ) : (
                  <ScrollView
                    ref={scrollRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={{ paddingVertical: Spacing.three }}
                    showsVerticalScrollIndicator={false}
                  >
                    {messages.map((msg) => {
                      const isOwn = msg.sender._id === currentUser?._id;
                      return (
                        <View
                          key={msg._id}
                          style={[
                            styles.bubbleRow,
                            { justifyContent: isOwn ? 'flex-end' : 'flex-start' },
                          ]}
                        >
                          <View
                            style={[
                              styles.messageBubble,
                              {
                                backgroundColor: isOwn ? '#4F46E5' : theme.backgroundElement,
                                borderBottomRightRadius: isOwn ? 4 : 16,
                                borderBottomLeftRadius: isOwn ? 16 : 4,
                              },
                            ]}
                          >
                            <ThemedText style={{ color: isOwn ? '#ffffff' : theme.text, fontSize: 14 }}>
                              {msg.text}
                            </ThemedText>

                            <View style={styles.bubbleStatusRow}>
                              <ThemedText style={{ color: isOwn ? '#C7D2FE' : theme.textSecondary, fontSize: 8 }}>
                                {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </ThemedText>
                              {isOwn && (
                                <SymbolView
                                  tintColor={msg.readBy.length > 1 ? '#10B981' : '#C7D2FE'}
                                  name={msg.readBy.length > 1 ? 'checkmark.seal.fill' : 'checkmark'}
                                  size={10}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Chat Typing Input */}
                <View style={[styles.typingBar, { borderTopColor: theme.backgroundElement }]}>
                  <TextInput
                    style={[styles.typingInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="Type a message..."
                    placeholderTextColor={isDark ? '#60646C' : '#90949C'}
                    value={typedMessage}
                    onChangeText={handleTypingText}
                  />
                  <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: '#4F46E5' }]}>
                    <SymbolView tintColor="#ffffff" name="paperplane.fill" size={16} />
                  </TouchableOpacity>
                </View>

              </View>
            ) : (
              <View style={styles.emptyPane}>
                <SymbolView tintColor={theme.textSecondary} name="bubble.left.and.bubble.right.fill" size={48} />
                <ThemedText type="subtitle" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                  Open a Chat Conversation
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Select an active room on the left side or create a new contact chat.
                </ThemedText>
              </View>
            )}
          </View>
        )}

      </View>

      {/* Contact Lookup Search Modal popup overlay */}
      {showSearchModal ? (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">New Conversation</ThemedText>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <SymbolView tintColor={theme.text} name="xmark" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <TextInput
                style={[styles.modalSearchInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Search user..."
                placeholderTextColor={isDark ? '#60646C' : '#90949C'}
                value={userQuery}
                onChangeText={setUserQuery}
              />
            </View>

            {searching ? (
              <ActivityIndicator style={{ flex: 1 }} size="small" color="#4F46E5" />
            ) : (
              <FlatList
                data={userResults}
                keyExtractor={(item) => item._id}
                style={{ flex: 1, marginTop: Spacing.two }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => startNewChat(item._id)}
                    style={styles.searchResultRow}
                  >
                    <Image
                      source={item.profilePic ? { uri: item.profilePic } : 'https://picsum.photos/id/1025/100/100'}
                      style={styles.searchAvatar}
                    />
                    <View>
                      <ThemedText type="smallBold">{item.username}</ThemedText>
                      {item.bio ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.bio}
                        </ThemedText>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', paddingVertical: Spacing.six }}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {userQuery.trim() ? 'No users found' : 'Type to search for people'}
                    </ThemedText>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  chatDashboard: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1200,
    height: '100%',
  },
  sidebar: {
    width: '32%',
    minWidth: 260,
    maxWidth: 360,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  newChatBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatsList: {
    alignItems: 'center',
    marginTop: Spacing.six,
    gap: Spacing.two,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chatPane: {
    flex: 1,
    height: '100%',
  },
  chatPaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  backBtn: {
    paddingRight: Spacing.two,
  },
  paneAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
    gap: 4,
  },
  bubbleStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.one,
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  typingInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPane: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  modalOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 450,
    height: '60%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  modalSearchBox: {
    paddingVertical: Spacing.two,
  },
  modalSearchInput: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 10,
    gap: Spacing.two,
  },
  searchAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
