import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.8;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ConversationSession, type ChatMessage } from '../ConversationSession';
import type { Session } from '../Sessions';
import InputBar from '../components/InputBar';
import MessageBubble from '../components/MessageBubble';
import SessionSidebar from '../components/SessionSidebar';
import useCursorBlink from '../hooks/useCursorBlink';
import { spacing } from '../theme';
import type { RootStackParamList, TabParamList } from '../navigation/types';

type HomeRoute = RouteProp<TabParamList, 'Home'>;

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

  const newConversationForCustomer = useCallback((customerId: number, customerName: string) => {
    const cs = new ConversationSession(setMessages, setIsStreaming, undefined, { id: customerId, name: customerName });
    sessionRef.current = cs;
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

  return { messages, isStreaming, sessionRef, session: sessionRef.current, loadSession, newConversation, newConversationForCustomer };
}

export default function HomeScreen() {
  const { messages, isStreaming, sessionRef, session, loadSession, newConversation, newConversationForCustomer } = useChatController();
  const cursorVisible = useCursorBlink(isStreaming);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const sidebarOpenRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const openSidebar = useCallback(() => {
    setSidebarMounted(true);
    sidebarOpenRef.current = true;
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideAnim]);

  const closeSidebar = useCallback(() => {
    sidebarOpenRef.current = false;
    Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 250, useNativeDriver: true }).start(
      ({ finished }) => { if (finished) setSidebarMounted(false); }
    );
  }, [slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !sidebarOpenRef.current && g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        setSidebarMounted(true);
      },
      onPanResponderMove: (_, g) => {
        slideAnim.setValue(Math.min(0, -SIDEBAR_WIDTH + Math.max(0, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SIDEBAR_WIDTH * 0.3) {
          sidebarOpenRef.current = true;
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        } else {
          Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }).start(
            ({ finished }) => { if (finished) setSidebarMounted(false); }
          );
        }
      },
    })
  ).current;
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<HomeRoute>();
  const { customerId, customerName, sessionId } = route.params ?? {};

  useEffect(() => {
    if (sessionId) {
      loadSession({ id: sessionId } as Session);
    } else if (customerId && customerName) {
      newConversationForCustomer(customerId, customerName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerName, sessionId]);

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
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cosailor</Text>
          <TouchableOpacity onPress={newConversation} style={styles.newButton}>
            <Text style={styles.newButtonIcon}>＋</Text>
          </TouchableOpacity>
        </View>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Welcome back!</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
          />
        )}
        <InputBar
          onSend={text => session.sendMessage(text)}
          isStreaming={isStreaming}
          onLive={() => navigation.navigate('LiveConversation', { session: sessionRef.current })}
        />
      </KeyboardAvoidingView>
      <SessionSidebar
        mounted={sidebarMounted}
        slideAnim={slideAnim}
        onClose={closeSidebar}
        onSelectSession={(s) => { closeSidebar(); loadSession(s); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#131315',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(19, 19, 21, 0.8)',
  },
  menuButton: {
    padding: spacing.sm,
  },
  menuIcon: {
    color: '#e5e1e4',
    fontSize: 20,
  },
  title: {
    color: '#adc6ff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginLeft: spacing.sm,
    flex: 1,
  },
  newButton: {
    padding: spacing.sm,
  },
  newButtonIcon: {
    color: '#e5e1e4',
    fontSize: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#e5e1e4',
    fontSize: 28,
    fontWeight: '700',
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
