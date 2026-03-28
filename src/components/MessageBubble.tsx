import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { ChatMessage, ToolStep } from '../ConversationSession';
import { saveFeedback } from '../db';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  message: ChatMessage;
  cursorVisible: boolean;
  onRetry: (id: number) => void;
};

const markdownStyles = {
  body: {
    color: '#fafafa',
    fontSize: typography.base.fontSize,
    lineHeight: typography.base.lineHeight,
  },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  heading1: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, color: '#fafafa', marginBottom: 4 },
  heading2: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, color: '#fafafa', marginBottom: 4 },
  heading3: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const, color: '#fafafa', marginBottom: 2 },
  bullet_list: { marginVertical: 2 },
  ordered_list: { marginVertical: 2 },
  list_item: { color: '#fafafa' },
  code_inline: {
    backgroundColor: '#27272a',
    color: '#a78bfa',
    fontFamily: 'Courier',
    fontSize: 13,
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: '#27272a',
    color: '#a78bfa',
    fontFamily: 'Courier',
    fontSize: 13,
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.mutedForeground,
    paddingLeft: 8,
    marginVertical: 4,
  },
  link: { color: '#818cf8' },
  paragraph: { marginVertical: 2 },
};

function stepLabel(step: ToolStep): string {
  const a = step.args as Record<string, string>;
  switch (step.name) {
    case 'fetch_notes':
      return `Fetching notes for ${a.customer_name ?? '…'}`;
    case 'save_note':
      return `Saving note for ${a.customer_name ?? '…'}`;
    case 'list_customers':
      return 'Looking up customers';
    case 'read_skill':
      return `Reading skill: ${a.name ?? '…'}`;
    default:
      return step.name.replace(/_/g, ' ');
  }
}

export default function MessageBubble({ message, cursorVisible, onRetry }: Props) {
  const isUser = message.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(message.feedback?.rating ?? null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const navigation = useNavigation<any>();

  const showFeedback = !isUser && !message.streaming && message.id !== undefined;

  async function handleRating(value: 1 | -1) {
    if (rating === value) return;
    setRating(value);
    setShowComment(true);
  }

  async function submitComment() {
    await saveFeedback(message.id!, rating!, comment.trim() || undefined);
    setShowComment(false);
  }
  const displayText = message.streaming
    ? message.content + (cursorVisible ? '|' : ' ')
    : message.content;

  const steps = message.toolSteps;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {isUser ? (
          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{displayText}</Text>
        ) : (
          <Markdown style={markdownStyles}>{displayText}</Markdown>
        )}
      </View>
      {steps && steps.length > 0 && (
        <View style={styles.stepsContainer}>
          <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.stepsToggle}>
            <Text style={styles.stepsToggleText}>
              {expanded ? '▾' : '▸'} {steps.length} {steps.length === 1 ? 'action' : 'actions'}
            </Text>
          </TouchableOpacity>
          {expanded && (
            <View style={styles.stepsList}>
              {steps.map(step => (
                <StepRow key={step.id} step={step} navigation={navigation} />
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

type FetchedNote = { text: string; session_id: number };

function StepRow({ step, navigation }: { step: ToolStep; navigation: any }) {
  const accentColor = stepAccentColor(step.status);
  const label = stepLabel(step);

  let fetchedNotes: FetchedNote[] | null = null;
  if (step.name === 'fetch_notes' && step.result && step.status === 'ok') {
    try {
      const parsed = JSON.parse(step.result);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        fetchedNotes = parsed as FetchedNote[];
      }
    } catch {
      // not parseable — fall back to plain result
    }
  }

  return (
    <View style={[styles.stepRow, { borderLeftColor: accentColor }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor(step.status) }]}>
          <Text style={styles.badgeText}>{step.status}</Text>
        </View>
      </View>

      {fetchedNotes !== null ? (
        fetchedNotes.length === 0 ? (
          <Text style={styles.stepMuted}>No notes found</Text>
        ) : (
          <View style={styles.notesList}>
            {fetchedNotes.map((note, i) => (
              <TouchableOpacity
                key={i}
                style={styles.noteItem}
                onPress={() => navigation.navigate('Home', { sessionId: note.session_id })}
              >
                <Text style={styles.noteText} numberOfLines={2}>{note.text}</Text>
                <Text style={styles.noteArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        step.result != null && (
          <Text style={styles.stepResult}>{resultSummary(step.result)}</Text>
        )
      )}
    </View>
  );
}

function resultSummary(result: string): string {
  const trimmed = result.trim();
  return trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
}

function stepAccentColor(status: ToolStep['status']): string {
  switch (status) {
    case 'running': return '#854d0e';
    case 'ok': return '#166534';
    case 'failed': return '#7f1d1d';
  }
}

function badgeColor(status: ToolStep['status']): string {
  switch (status) {
    case 'running': return '#292524';
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
  stepsContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  stepsToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#27272a',
  },
  stepsToggleText: {
    color: colors.mutedForeground,
    ...typography.sm,
  },
  stepsList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  stepRow: {
    backgroundColor: '#1e1e20',
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    paddingLeft: spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepLabel: {
    color: '#e4e4e7',
    ...typography.sm,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.xs,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fafafa',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
  stepMuted: {
    color: colors.mutedForeground,
    ...typography.sm,
  },
  stepResult: {
    color: '#a1a1aa',
    ...typography.sm,
    marginTop: 2,
  },
  notesList: {
    marginTop: 4,
    gap: 4,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  noteText: {
    flex: 1,
    color: '#d4d4d8',
    ...typography.sm,
  },
  noteArrow: {
    color: colors.mutedForeground,
    fontSize: 16,
    lineHeight: 20,
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
