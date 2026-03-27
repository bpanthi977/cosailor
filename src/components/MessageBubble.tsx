import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ChatMessage } from '../ConversationSession';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  message: ChatMessage;
  cursorVisible: boolean;
  onRetry: (id: number) => void;
};

export default function MessageBubble({ message, cursorVisible, onRetry }: Props) {
  const isUser = message.role === 'user';
  const displayText = message.streaming
    ? message.content + (cursorVisible ? '|' : ' ')
    : message.content;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {message.toolStatus ? (
          <Text style={styles.toolStatusText}>{message.toolStatus}</Text>
        ) : null}
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {displayText}
        </Text>
      </View>
      {message.status === 'failed' && message.id !== undefined && (
        <TouchableOpacity onPress={() => onRetry(message.id!)} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  toolStatusText: {
    color: colors.mutedForeground,
    ...typography.base,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
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
});
