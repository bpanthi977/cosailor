import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveConversation'>;

export default function LiveConversationScreen({ route, navigation }: Props) {
  const { session } = route.params;
  const {
    phase,
    partialText,
    messages,
    responseText,
    spokenCharIndex,
    userBars,
    aiBars,
    start,
    endConversation,
  } = useLiveConversation(session);

  const listRef = useRef<FlatList>(null);

  // Start listening as soon as the screen mounts
  useEffect(() => {
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Block back gesture while conversation is active
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (phase !== 'idle') {
        e.preventDefault();
      }
    });
    return unsub;
  }, [navigation, phase]);

  const handleEnd = () => {
    endConversation();
    navigation.goBack();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={item.role === 'user' ? styles.userBubble : styles.aiBubble}>
      <Text style={item.role === 'user' ? styles.userText : styles.aiText}>
        {item.content}
      </Text>
    </View>
  );

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

      {/* Current exchange — prominent foreground text */}
      <View style={styles.currentExchange}>
        {phase === 'listening' && (
          <Text style={styles.currentText} numberOfLines={6}>
            {partialText || '...'}
          </Text>
        )}
        {phase === 'processing_ai' && (
          <ActivityIndicator color="#a1a1aa" size="small" />
        )}
        {phase === 'speaking_ai' && responseText ? (
          <Text style={styles.currentText} numberOfLines={6}>
            <Text style={styles.spokenText}>{responseText.slice(0, spokenCharIndex)}</Text>
            <Text style={styles.pendingText}>{responseText.slice(spokenCharIndex)}</Text>
          </Text>
        ) : null}
        {phase === 'idle' && (
          <Text style={styles.idleText}>Tap to start</Text>
        )}
        {phase === 'error' && (
          <Text style={styles.errorText}>Reconnecting...</Text>
        )}
      </View>

      {/* Waveforms */}
      <View style={styles.waveforms}>
        <View style={styles.waveformSide}>
          <Waveform bars={userBars} color="#6366f1" />
          <Text style={styles.waveformLabel}>You</Text>
        </View>
        <View style={styles.waveformSide}>
          <Waveform bars={aiBars} color="#22d3ee" />
          <Text style={styles.waveformLabel}>CoSailor</Text>
        </View>
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
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    maxWidth: '80%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    maxWidth: '80%',
  },
  userText: {
    color: '#ffffff',
    ...typography.base,
  },
  aiText: {
    color: '#e4e4e7',
    ...typography.base,
  },
  currentExchange: {
    minHeight: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
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
    ...typography.base,
  },
  errorText: {
    color: '#f87171',
    ...typography.base,
  },
  waveforms: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  waveformSide: {
    alignItems: 'center',
    gap: spacing.xs,
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
