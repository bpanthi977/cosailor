import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getSessions, type SessionListItem } from '../Sessions';
import { colors, radius, spacing, typography } from '../theme';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.8;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: SessionListItem) => void;
  onNewConversation: () => void;
};

export default function SessionSidebar({
  visible,
  onClose,
  onSelectSession,
  onNewConversation,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const [mounted, setMounted] = useState(visible);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      getSessions().then(setSessions);
    }
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        setSearch('');
      }
    });
  }, [visible, slideAnim]);

  const filtered = sessions.filter(s =>
    (s.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Conversations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.newButton} onPress={onNewConversation}>
          <Text style={styles.newButtonText}>+ New Conversation</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          placeholderTextColor={colors.mutedForeground}
        />

        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.sessionRow} onPress={() => onSelectSession(item)}>
              <View style={styles.sessionRowHeader}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {item.title || 'Untitled'}
                </Text>
                {item.has_notes && <Text style={styles.notesIndicator}>📝</Text>}
              </View>
              <Text style={styles.sessionDate}>{formatDate(item.updated_at)}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#09090b',
    borderRightWidth: 1,
    borderRightColor: '#27272a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    ...typography.lg,
    color: '#fafafa',
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    color: colors.mutedForeground,
    fontSize: 16,
  },
  newButton: {
    margin: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  newButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
  searchInput: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    color: '#fafafa',
    ...typography.base,
  },
  sessionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sessionRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitle: {
    ...typography.base,
    color: '#fafafa',
    flex: 1,
  },
  notesIndicator: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  sessionDate: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: spacing.md,
  },
});
