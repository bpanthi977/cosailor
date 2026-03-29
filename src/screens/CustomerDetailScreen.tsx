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
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { SessionListItem } from '@/Sessions';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
type Route = RouteProp<RootStackParamList, 'CustomerDetail'>;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

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
            <View key={note.id} style={styles.noteRow}>
              <TouchableOpacity style={styles.noteContent} onPress={() => handleSelectNote(note)}>
                <Text style={styles.noteText}>{note.text}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteNote(note.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionHeader, styles.sectionHeaderGap]}>Conversations</Text>
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
                  {!!session.has_notes && <Text style={styles.notesIndicator}>📝</Text>}
		</View>
                <Text style={styles.sessionDate}>{formatDate(session.updated_at)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSession(session.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteIcon}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startChatButton} onPress={handleStartChat}>
          <Text style={styles.startChatText}>+ Start new chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    color: '#fafafa',
    fontSize: 20,
  },
  title: {
    ...typography.lg,
    color: '#fafafa',
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderGap: {
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.sm,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  noteContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  noteText: {
    ...typography.base,
    color: '#fafafa',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  sessionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesIndicator: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    ...typography.base,
    color: '#fafafa',
  },
  sessionDate: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  deleteIcon: {
    color: colors.mutedForeground,
    fontSize: 20,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  startChatButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  startChatText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
});
