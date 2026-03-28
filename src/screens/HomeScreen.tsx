import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ConversationSession, type ChatMessage } from '../ConversationSession';
import type { Session } from '../Sessions';
import InputBar from '../components/InputBar';
import MessageBubble from '../components/MessageBubble';
import SessionSidebar from '../components/SessionSidebar';
import useCursorBlink from '../hooks/useCursorBlink';
import { spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function useChatController() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionRef = useRef(new ConversationSession(setMessages, setIsStreaming));

  const loadSession = useCallback(async (s: Session) => {
    const cs = new ConversationSession(setMessages, setIsStreaming, s.id);
    sessionRef.current = cs;
    await cs.loadMessages();
  }, []);

  const newConversation = useCallback(() => {
    sessionRef.current = new ConversationSession(setMessages, setIsStreaming);
    setMessages([]);
  }, []);

  // Re-register callbacks when screen regains focus (after LiveConversation modal)
  useFocusEffect(
    useCallback(() => {
      const session = sessionRef.current;
      session.setCallbacks(setMessages, setIsStreaming);
      setMessages(session.getMessages());
    }, []),
  );

  return { messages, isStreaming, sessionRef, session: sessionRef.current, loadSession, newConversation };
}

export default function HomeScreen() {
  const { messages, isStreaming, sessionRef, session, loadSession, newConversation } = useChatController();
  const cursorVisible = useCursorBlink(isStreaming);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      cursorVisible={cursorVisible}
      onRetry={id => session.retryMessage(id)}
    />
  ), [cursorVisible, session]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('LiveConversation', { session: sessionRef.current })}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>◉</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
        />
        <InputBar onSend={text => session.sendMessage(text)} isStreaming={isStreaming} />
      </KeyboardAvoidingView>
      <SessionSidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={(s) => { setSidebarOpen(false); loadSession(s); }}
        onNewConversation={() => { setSidebarOpen(false); newConversation(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  menuButton: {
    padding: spacing.sm,
  },
  menuIcon: {
    color: '#fafafa',
    fontSize: 20,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
