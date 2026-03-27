import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { ConversationSession, type ChatMessage, type SessionEvent } from '../ConversationSession';
import { getSessions, type Session } from '../Sessions';
import { VoiceInput } from '../VoiceInput';
import InputBar from '../components/InputBar';
import MessageBubble from '../components/MessageBubble';
import SessionSidebar from '../components/SessionSidebar';
import { spacing } from '../theme';

export default function HomeScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const listRef = useRef<FlatList>(null);
  const cursorInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef(new ConversationSession());
  // Mirror of inputText used in voice callbacks to avoid stale closures
  const inputTextRef = useRef('');

  useEffect(() => {
    setVoiceAvailable(VoiceInput.isAvailable());
    return () => VoiceInput.destroy();
  }, []);

  // Blink cursor while streaming
  useEffect(() => {
    if (isStreaming) {
      cursorInterval.current = setInterval(() => {
        setCursorVisible(v => !v);
      }, 500);
    } else {
      if (cursorInterval.current) {
        clearInterval(cursorInterval.current);
        cursorInterval.current = null;
      }
      setCursorVisible(true);
    }
    return () => {
      if (cursorInterval.current) clearInterval(cursorInterval.current);
    };
  }, [isStreaming]);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const applyEvents = useCallback(async (gen: AsyncGenerator<SessionEvent>) => {
    setIsStreaming(true);
    try {
      for await (const event of gen) {
        if (event.type === 'add_messages') {
          setMessages(prev => [...prev, event.userMsg, event.aiMsg]);
        } else if (event.type === 'chunk') {
          setMessages(prev =>
            prev.map(m => m.id === event.id ? { ...m, content: event.content } : m)
          );
        } else if (event.type === 'tool_status') {
          setMessages(prev =>
            prev.map(m => m.streaming ? { ...m, toolStatus: event.label } : m)
          );
        } else if (event.type === 'done') {
          setMessages(prev =>
            prev.map(m =>
              m.id === event.id ? { ...m, streaming: false, status: event.status, toolStatus: undefined } : m
            )
          );
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const sendText = useCallback(async (text: string, currentMessages: ChatMessage[]) => {
    if (!text.trim() || isStreaming) return;
    setInputText('');
    inputTextRef.current = '';
    await applyEvents(sessionRef.current.sendMessage(text.trim(), currentMessages));
  }, [isStreaming, applyEvents]);

  const handleSend = useCallback(() => {
    sendText(inputTextRef.current, messages);
  }, [messages, sendText]);

  const handleChangeText = useCallback((text: string) => {
    setInputText(text);
    inputTextRef.current = text;
  }, []);

  const handleRetry = useCallback(async (failedMsgId: number) => {
    if (isStreaming) return;
    await applyEvents(sessionRef.current.retryMessage(failedMsgId));
  }, [isStreaming, applyEvents]);

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      VoiceInput.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const capturedMessages = messages;
      await VoiceInput.start({
        onPartial: (text) => {
          setInputText(text);
          inputTextRef.current = text;
        },
        onResult: (text) => {
          setIsRecording(false);
          sendText(text, capturedMessages);
        },
        onError: () => {
          setIsRecording(false);
        },
      });
    }
  }, [isRecording, messages, sendText]);

  const openSidebar = useCallback(async () => {
    setSessions(await getSessions());
    setSidebarOpen(true);
  }, []);

  const handleSelectSession = useCallback(async (s: Session) => {
    setSidebarOpen(false);
    const cs = new ConversationSession(s.id);
    sessionRef.current = cs;
    setMessages(await cs.loadMessages());
  }, []);

  const handleNewConversation = useCallback(() => {
    setSidebarOpen(false);
    sessionRef.current = new ConversationSession();
    setMessages([]);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      cursorVisible={cursorVisible}
      onRetry={handleRetry}
    />
  ), [cursorVisible, handleRetry]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
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
        <InputBar
          inputText={inputText}
          onChangeText={handleChangeText}
          onSend={handleSend}
          isStreaming={isStreaming}
          isRecording={isRecording}
          onMicToggle={handleMicToggle}
          voiceAvailable={voiceAvailable}
        />
      </KeyboardAvoidingView>
      <SessionSidebar
        visible={sidebarOpen}
        sessions={sessions}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewConversation={handleNewConversation}
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
