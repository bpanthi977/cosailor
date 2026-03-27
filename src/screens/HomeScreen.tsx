import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationSession, type ChatMessage, SessionEvent } from '../ConversationSession';
import { colors, radius, spacing, typography } from '../theme';

export default function HomeScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const listRef = useRef<FlatList>(null);
  const cursorInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const session = useRef(new ConversationSession()).current;

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

  const applyEvents = useCallback(async (
    gen: AsyncGenerator<SessionEvent>
  ) => {
    setIsStreaming(true);
    try {
      for await (const event of gen) {
        if (event.type === 'add_messages') {
          setMessages(prev => [...prev, event.userMsg, event.aiMsg]);
        } else if (event.type === 'chunk') {
          setMessages(prev =>
            prev.map(m => m.id === event.id ? { ...m, content: event.content } : m)
          );
        } else if (event.type === 'done') {
          setMessages(prev =>
            prev.map(m =>
              m.id === event.id ? { ...m, streaming: false, status: event.status } : m
            )
          );
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setInputText('');
    await applyEvents(session.sendMessage(text, messages));
  }, [inputText, isStreaming, messages, session, applyEvents]);

  const handleRetry = useCallback(async (failedMsgId: number) => {
    if (isStreaming) return;
    await applyEvents(session.retryMessage(failedMsgId));
  }, [isStreaming, session, applyEvents]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const displayText = item.streaming
      ? item.content + (cursorVisible ? '|' : ' ')
      : item.content;

    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {displayText}
          </Text>
        </View>
        {item.status === 'failed' && item.id !== undefined && (
          <TouchableOpacity onPress={() => handleRetry(item.id!)} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [cursorVisible, handleRetry]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            onSubmitEditing={handleSend}
            submitBehavior="newline"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isStreaming) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubbleRow: {
    marginVertical: spacing.xs,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAI: {
    backgroundColor: '#1c1c1e',
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: {
    ...typography.base,
  },
  bubbleTextUser: {
    color: colors.primaryForeground,
  },
  bubbleTextAI: {
    color: '#fafafa',
  },
  retryButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: colors.primary,
    ...typography.base,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#fafafa',
    ...typography.base,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
});
