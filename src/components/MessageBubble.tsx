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
    color: '#e5e1e4',
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
      return `Fetching notes for ${a.customer_name ?? '...'}`;
    case 'save_note':
      return `Saving note for ${a.customer_name ?? '...'}`;
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

  const steps = message.toolSteps;
  const savedNote = steps?.some(s => s.name === 'save_note' && s.status === 'ok') ?? false;

  const lastStep = steps && steps.length > 0 ? steps[steps.length - 1]: undefined;
  let thinkingSteps = '';
  if (!isUser && lastStep) {
    if (message.content == '')
      thinkingSteps = stepLabel(lastStep);
    else if (lastStep.status == 'running')
      thinkingSteps = '\n' + stepLabel(lastStep);
  }
  
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {isUser ? (
          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{message.content}</Text>
        ) : (
          <>
            <Markdown style={markdownStyles}>{message.content + thinkingSteps}</Markdown>
            {message.streaming && (
              <Text style={styles.streamingCursor}>{cursorVisible ? '|' : ' '}</Text>
            )}
          </>
        )}
      </View>
      {savedNote && (
        <View style={styles.noteIndicator}>
          <Text style={styles.noteIndicatorText}>📝 Note saved</Text>
        </View>
      )}
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

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;
  return (
    <TouchableOpacity activeOpacity={isLong ? 0.7 : 1} onPress={() => isLong && setExpanded(e => !e)}>
      <Text style={styles.stepResult} numberOfLines={expanded ? undefined : 3}>{text}</Text>
      {isLong && (
        <Text style={styles.stepMuted}>{expanded ? 'show less' : 'show more'}</Text>
      )}
    </TouchableOpacity>
  );
}

function StringList({ items, limit = 3 }: { items: string[]; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) {
    return <Text style={styles.stepMuted}>→ Empty</Text>;
  }
  const visible = showAll ? items : items.slice(0, limit);
  const hasMore = items.length > limit;
  return (
    <View style={styles.stringList}>
      {visible.map((item, i) => (
        <Text key={i} style={styles.stringListItem}>• {item}</Text>
      ))}
      {hasMore && (
        <TouchableOpacity onPress={() => setShowAll(s => !s)}>
          <Text style={styles.stepMuted}>
            {showAll ? 'show less' : `show ${items.length - limit} more…`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function NotesList({ notes, navigation }: { notes: FetchedNote[]; navigation: any }) {
  const [expandedNotes, setExpandedNotes] = useState<boolean[]>(() => notes.map(() => false));

  if (notes.length === 0) {
    return <Text style={styles.stepMuted}>→ Empty</Text>;
  }

  function toggleNote(i: number) {
    setExpandedNotes(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <View style={styles.notesList}>
      {notes.map((note, i) => (
        <View key={i} style={styles.noteItem}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.push('Home', { sessionId: note.session_id })}>
            <Text style={styles.noteText} numberOfLines={expandedNotes[i] ? undefined : 2}>
              {note.text}
            </Text>
          </TouchableOpacity>
          {note.text.length > 80 && (
            <TouchableOpacity onPress={() => toggleNote(i)}>
              <Text style={styles.noteArrow}>{expandedNotes[i] ? '↑' : '↓'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

function StepRow({ step, navigation }: { step: ToolStep; navigation: any }) {
  const accentColor = stepAccentColor(step.status);
  const label = stepLabel(step);

  function renderResult() {
    if (step.result == null) return null;

    if (step.name === 'fetch_notes' && step.status === 'ok') {
      try {
        const parsed = JSON.parse(step.result);
        if (Array.isArray(parsed)) {
          const notes = parsed.every(x => typeof x === 'object')
            ? (parsed as FetchedNote[])
            : [];
          return <NotesList notes={notes} navigation={navigation} />;
        }
      } catch { /* fall through */ }
    }

    if (step.name === 'save_note' && step.status === 'ok') {
      const noteText = (step.args as Record<string, string>).note;
      if (noteText) return <ExpandableText text={noteText} />;
    }

    if (step.name === 'list_customers' && step.status === 'ok') {
      try {
        const parsed = JSON.parse(step.result);
        if (Array.isArray(parsed)) {
          return <StringList items={parsed as string[]} />;
        }
      } catch { /* fall through */ }
    }

    return <ExpandableText text={step.result} />;
  }

  return (
    <View style={[styles.stepRow, { borderLeftColor: accentColor }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor(step.status) }]}>
          <Text style={styles.badgeText}>{step.status}</Text>
        </View>
      </View>
      {renderResult()}
    </View>
  );
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
    maxWidth: '92%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  bubbleUser: {
    backgroundColor: '#0f69dc',
    borderTopRightRadius: 2,
  },
  bubbleAI: {
    backgroundColor: '#201f22',
    borderTopLeftRadius: 2,
  },
  bubbleText: {
    ...typography.base,
  },
  bubbleTextUser: {
    color: '#ecf0ff',
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
  stringList: {
    marginTop: 4,
    gap: 2,
  },
  streamingCursor: {
    color: '#fafafa',
    ...typography.base,
  },
  noteIndicator: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  stringListItem: {
    color: '#d4d4d8',
    ...typography.sm,
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
  noteIndicator: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  noteIndicatorText: {
    color: colors.mutedForeground,
    ...typography.sm,
  },
});
