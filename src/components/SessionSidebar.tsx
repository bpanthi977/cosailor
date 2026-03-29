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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSessions, type SessionListItem } from '../Sessions';
import { radius, spacing, typography } from '../theme';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.8;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (session: SessionListItem) => void;
};

export default function SessionSidebar({
  visible,
  onClose,
  onSelectSession,
}: Props) {
  const insets = useSafeAreaInsets();
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Conversations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          placeholderTextColor="rgba(195, 198, 215, 0.4)"
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
    backgroundColor: '#131315',
    borderRightWidth: 1,
    borderRightColor: '#27272a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    ...typography.lg,
    color: '#adc6ff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    color: '#e5e1e4',
    fontSize: 16,
  },
  searchInput: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(42, 42, 44, 0.75)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(67, 70, 85, 0.25)',
    color: '#e5e1e4',
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
    color: '#e5e1e4',
    flex: 1,
  },
  notesIndicator: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  sessionDate: {
    ...typography.sm,
    color: 'rgba(195, 198, 215, 0.7)',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: spacing.md,
  },
});
