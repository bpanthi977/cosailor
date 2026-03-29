import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useLiveConversation } from '../hooks/useLiveConversation';
import Waveform from '../components/Waveform';
import { type ChatMessage } from '../ConversationSession';
import MessageBubble from '../components/MessageBubble';
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveConversation'>;

// How many pixels to leave below the spoken boundary so pending text peeks in
const SCROLL_PADDING = 60;

export default function LiveConversationScreen({ route, navigation }: Props) {
  const { session } = route.params;
  const {
    phase,
    partialText,
    messages,
    responseText,
    spokenCharIndex,
    bars,
    waveformColor,
    start,
    endConversation,
  } = useLiveConversation(session);

  const listRef = useRef<FlatList>(null);
  const exchangeScrollRef = useRef<ScrollView>(null);
  const spokenViewRef = useRef<View>(null);
  const isEndingRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Start listening as soon as the screen mounts
  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setCursorVisible(v => !v), 500);
    return () => clearInterval(id);
  }, []);

  // Block back gesture while conversation is active (but not when user taps End)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!isEndingRef.current && phase !== 'idle') {
        e.preventDefault();
      }
    });
    return unsub;
  }, [navigation, phase]);

  // Scroll so the spoken/pending boundary stays in focus
  useEffect(() => {
    if (phase !== 'speaking_ai' || !spokenViewRef.current) return;
    spokenViewRef.current.measure((_x, _y, _w, h) => {
      exchangeScrollRef.current?.scrollTo({
        y: Math.max(0, h - SCROLL_PADDING),
        animated: true,
      });
    });
  }, [spokenCharIndex, phase]);

  const handleEnd = () => {
    isEndingRef.current = true;
    endConversation();
    navigation.goBack();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      cursorVisible={cursorVisible}
      onRetry={() => {}}
    />
  );

  const waveformLabel =
    phase === 'listening' ? 'You' :
    phase === 'speaking_ai' ? 'CoSailor' :
    phase === 'processing_ai' ? '...' : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Transcript */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.transcript}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        style={styles.transcriptList}
      />

      {/* Current exchange — prominent foreground text, scrollable */}
      <ScrollView
        ref={exchangeScrollRef}
        style={styles.currentExchangeScroll}
        contentContainerStyle={styles.currentExchangeContent}
        scrollEnabled={false}
      >
        {phase === 'listening' && (
          <Text style={styles.currentText}>
            {partialText || '...'}
          </Text>
        )}
        {phase === 'processing_ai' && (
          <ActivityIndicator color="#a1a1aa" size="small" />
        )}
        {phase === 'speaking_ai' && responseText ? (
          <>
            <View ref={spokenViewRef}>
              <Text style={[styles.currentText, styles.spokenText]}>
                {responseText.slice(0, spokenCharIndex)}
              </Text>
            </View>
            <Text style={[styles.currentText, styles.pendingText]}>
              {responseText.slice(spokenCharIndex)}
            </Text>
          </>
        ) : null}
        {phase === 'idle' && (
          <Text style={styles.idleText}>Tap to start</Text>
        )}
        {phase === 'error' && (
          <Text style={styles.errorText}>Reconnecting...</Text>
        )}
      </ScrollView>

      {/* Single waveform */}
      <View style={styles.waveformSection}>
        <Waveform bars={bars} color={waveformColor} height={56} barWidth={6} />
        {waveformLabel ? (
          <Text style={styles.waveformLabel}>{waveformLabel}</Text>
        ) : null}
      </View>

      {/* End button */}
      <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
        <Text style={styles.endButtonText}>End Conversation</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  transcriptList: {
    flex: 1,
  },
  transcript: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  currentExchangeScroll: {
    maxHeight: 160,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  currentExchangeContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
  },
  currentText: {
    color: '#fafafa',
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '500',
  },
  spokenText: {
    color: '#fafafa',
  },
  pendingText: {
    color: '#71717a',
  },
  idleText: {
    color: '#71717a',
    textAlign: 'center',
    ...typography.base,
  },
  errorText: {
    color: '#f87171',
    textAlign: 'center',
    ...typography.base,
  },
  waveformSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  waveformLabel: {
    color: '#71717a',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  endButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#3f3f46',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  endButtonText: {
    color: '#fafafa',
    ...typography.base,
    fontWeight: '600',
  },
});
