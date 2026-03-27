import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { ChatMessage, ToolStep } from '../ConversationSession';
import { saveFeedback } from '../db';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  message: ChatMessage;
  cursorVisible: boolean;
  onRetry: (id: number) => void;
};

export default function MessageBubble({ message, cursorVisible, onRetry }: Props) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const showFeedback = !isUser && !message.streaming && message.id !== undefined;

  async function handleRating(value: 1 | -1) {
    if (rating === value) return;
    setRating(value);
    if (value === 1) {
      setShowComment(false);
      await saveFeedback(message.id!, 1);
    } else {
      setShowComment(true);
    }
  }

  async function submitComment() {
    await saveFeedback(message.id!, -1, comment.trim() || undefined);
    setShowComment(false);
  }
  const displayText = message.streaming
    ? message.content + (cursorVisible ? '|' : ' ')
    : message.content;

  const steps = message.toolSteps;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {displayText}
        </Text>
      </View>
      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.stepsToggle}>
            <Text style={styles.stepsToggleText}>
              {expanded ? '▼' : '▶'} {steps.length} {steps.length === 1 ? 'step' : 'steps'}
            </Text>
          </TouchableOpacity>
          {expanded && (
            <View style={styles.stepsList}>
              {steps.map(step => (
                <StepRow key={step.id} step={step} />
              ))}
            </View>
          )}
        </View>
      )}
      {message.status === 'failed' && message.id !== undefined && (
        <TouchableOpacity onPress={() => onRetry(message.id!)} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
      {showFeedback && (
        <>
          <View style={styles.feedbackRow}>
            <TouchableOpacity onPress={() => handleRating(1)} style={styles.thumbBtn}>
              <Text style={[styles.thumbText, rating === 1 && styles.thumbSelected]}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRating(-1)} style={styles.thumbBtn}>
              <Text style={[styles.thumbText, rating === -1 && styles.thumbSelected]}>👎</Text>
            </TouchableOpacity>
          </View>
          {showComment && (
            <View style={styles.commentRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Optional comment…"
                placeholderTextColor={colors.mutedForeground}
                value={comment}
                onChangeText={setComment}
                returnKeyType="send"
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity onPress={submitComment} style={styles.submitBtn}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function StepRow({ step }: { step: ToolStep }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepName}>{step.name}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor(step.status) }]}>
          <Text style={styles.badgeText}>{step.status}</Text>
        </View>
      </View>
      <Text style={styles.stepArgs}>{argsSummary(step.args)}</Text>
      {step.result != null && (
        <Text style={styles.stepResult}>{resultSummary(step.result)}</Text>
      )}
    </View>
  );
}

function argsSummary(args: object): string {
  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return '';
  const parts = entries.map(([k, v]) => `${k}=${String(v)}`).join(', ');
  return parts.length > 40 ? parts.slice(0, 40) + '…' : parts;
}

function resultSummary(result: string): string {
  const trimmed = result.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed;
}

function badgeColor(status: ToolStep['status']): string {
  switch (status) {
    case 'running': return '#854d0e';
    case 'ok': return '#14532d';
    case 'failed': return '#7f1d1d';
  }
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
  stepsContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  stepsToggle: {
    paddingVertical: spacing.xs,
  },
  stepsToggleText: {
    color: colors.mutedForeground,
    ...typography.sm,
  },
  stepsList: {
    gap: spacing.xs,
  },
  stepRow: {
    backgroundColor: '#27272a',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stepName: {
    color: '#fafafa',
    ...typography.sm,
    fontWeight: '600',
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fafafa',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  stepArgs: {
    color: colors.mutedForeground,
    ...typography.sm,
  },
  stepResult: {
    color: '#a1a1aa',
    ...typography.sm,
    marginTop: 2,
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
  feedbackRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  thumbBtn: {
    padding: spacing.xs,
  },
  thumbText: {
    fontSize: 16,
    opacity: 0.35,
  },
  thumbSelected: {
    opacity: 1,
  },
  commentRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '75%',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.mutedForeground,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: '#fafafa',
    ...typography.base,
  },
  submitBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  submitText: {
    color: colors.primary,
    ...typography.base,
    fontWeight: '600',
  },
});
