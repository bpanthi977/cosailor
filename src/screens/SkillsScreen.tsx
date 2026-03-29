import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listSkills, type DbSkill } from '../db';
import { radius, spacing, typography } from '../theme';
import EditSkillScreen, { type EditSkillState } from './EditSkillScreen';

export default function SkillsScreen() {
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [editState, setEditState] = useState<EditSkillState | null>(null);

  const reload = useCallback(() => {
    listSkills().then(setSkills);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (editState !== null) {
    return (
      <EditSkillScreen
        editState={editState}
        onBack={() => setEditState(null)}
        onSaved={() => { reload(); setEditState(null); }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Skills</Text>
        <TouchableOpacity onPress={() => setEditState({ mode: 'add' })} style={styles.addButton}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={skills}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={
          <View style={styles.heroSection}>
            <Text style={styles.heroHeading}>Precision Co-Pilot Skills</Text>
            <Text style={styles.heroDescription}>
              Refine how your AI assistant processes interactions. These pre-configured skills ensure consistent output quality.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No skills yet. Tap + to add one.</Text>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.skillCard} onPress={() => setEditState({ mode: 'edit', skill: item })}>
            <View style={styles.skillCardContent}>
              <Text style={styles.skillName}>{item.name}</Text>
              <Text style={styles.skillSummary} numberOfLines={2}>{item.summary}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
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
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(67,70,85,0.2)',
  },
  title: {
    ...typography.lg,
    color: '#adc6ff',
    fontWeight: '700',
    marginLeft: spacing.sm,
    flex: 1,
  },
  addButton: {
    padding: spacing.sm,
  },
  addText: {
    color: '#adc6ff',
    fontSize: 24,
    fontWeight: '300',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 4,
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e5e1e4',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    ...typography.base,
    color: '#c3c6d7',
    lineHeight: 22,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1b1d',
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 10,
  },
  skillCardContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  skillName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e5e1e4',
    marginBottom: 4,
  },
  skillSummary: {
    ...typography.sm,
    color: '#c3c6d7',
  },
  chevron: {
    color: '#8d90a0',
    fontSize: 22,
  },
  emptyText: {
    ...typography.base,
    color: '#c3c6d7',
    textAlign: 'center',
    marginTop: spacing.md * 3,
  },
});
