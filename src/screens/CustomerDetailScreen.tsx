import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { fetchNotes, getSessionsForCustomer, deleteNote, deleteSession } from '../db';
import type { Note, Session } from '../db';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { SessionListItem } from '@/Sessions';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
type Route = RouteProp<RootStackParamList, 'CustomerDetail'>;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function formatRelative(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3600000;
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)} days ago`;
}

export default function CustomerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { customerId, customerName } = route.params;

  const [notes, setNotes] = useState<Note[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  const loadData = useCallback(async () => {
    const [notesResult, sessionsResult] = await Promise.all([
      fetchNotes(customerName),
      getSessionsForCustomer(customerId),
    ]);
    setNotes(notesResult?.notes ?? []);
    setSessions(sessionsResult);
  }, [customerId, customerName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteNote = useCallback(async (noteId: number) => {
    await deleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: number) => {
    await deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setNotes(prev => prev.filter(n => n.session_id !== sessionId));
  }, []);

  const handleSelectNote = useCallback((note: Note) => {
    navigation.navigate('MainTabs', { screen: 'Home', params: { customerId, customerName, sessionId: note.session_id } });
  }, [navigation, customerId, customerName]);

  const handleSelectSession = useCallback((session: Session) => {
    navigation.navigate('MainTabs', { screen: 'Home', params: { customerId, customerName, sessionId: session.id } });
  }, [navigation, customerId, customerName]);

  const handleStartChat = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Home', params: { customerId, customerName } });
  }, [navigation, customerId, customerName]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{customerName}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>Notes</Text>
        {notes.length === 0 ? (
          <Text style={styles.emptyText}>No notes yet</Text>
        ) : (
          notes.map(note => (
            <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => handleSelectNote(note)} activeOpacity={0.8}>
              <TouchableOpacity
                style={styles.noteDeleteButton}
                onPress={() => handleDeleteNote(note.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.noteDeleteIcon}>×</Text>
              </TouchableOpacity>
              <Text style={styles.noteText}>{note.text}</Text>
              <View style={styles.noteTimestamp}>
                <Text style={styles.noteTimestampIcon}>◷</Text>
                <Text style={styles.noteTimestampText}>{formatRelative(note.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={[styles.sectionHeader, styles.sectionHeaderGap]}>
          Conversations{sessions.length > 0 ? ` (${sessions.length})` : ''}
        </Text>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No conversations yet</Text>
        ) : (
          sessions.map(session => (
            <View key={session.id} style={styles.sessionRow}>
              <TouchableOpacity
                style={styles.sessionInfo}
                onPress={() => handleSelectSession(session)}
              >
                <View style={styles.sessionRowHeader}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.title || 'Untitled'}
                  </Text>
                  {!!session.has_notes && <Text style={styles.notesIndicator}>◻</Text>}
                </View>
                <View style={styles.sessionDateRow}>
                  <Text style={styles.sessionDateIcon}>◷</Text>
                  <Text style={styles.sessionDate}>{formatDate(session.updated_at)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(session.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>⌫</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabButton} onPress={handleStartChat}>
          <Text style={styles.fabText}>+  Start new chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131315',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    color: '#c3c6d7',
    fontSize: 20,
  },
  title: {
    ...typography.lg,
    color: '#adc6ff',
    fontWeight: '700',
    marginLeft: spacing.sm,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c3c6d7',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderGap: {
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.sm,
    color: colors.mutedForeground,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
  },
  noteCard: {
    backgroundColor: '#1c1b1d',
    borderRadius: 12,
    padding: 20,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(67, 70, 85, 0.15)',
  },
  noteDeleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  noteDeleteIcon: {
    color: '#8d90a0',
    fontSize: 20,
    lineHeight: 22,
  },
  noteText: {
    ...typography.base,
    color: '#e5e1e4',
    paddingRight: 24,
    lineHeight: 22,
  },
  noteTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  noteTimestampIcon: {
    color: '#8d90a0',
    fontSize: 12,
  },
  noteTimestampText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8d90a0',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  sessionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesIndicator: {
    fontSize: 14,
    color: '#8d90a0',
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    ...typography.base,
    fontWeight: '700',
    color: '#e5e1e4',
  },
  sessionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  sessionDateIcon: {
    color: '#8d90a0',
    fontSize: 12,
  },
  sessionDate: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8d90a0',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteIcon: {
    color: '#8d90a0',
    fontSize: 18,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#adc6ff',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#002e6a',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
