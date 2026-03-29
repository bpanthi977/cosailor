import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listSkills, createSkill, updateSkill, deleteSkill, type DbSkill } from '../db';
import { radius, spacing, typography } from '../theme';

type EditState = { mode: 'add' } | { mode: 'edit'; skill: DbSkill };

export default function SkillsScreen() {
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);

  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [instructions, setInstructions] = useState('');

  const reload = useCallback(() => {
    listSkills().then(setSkills);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openAdd = () => {
    setName('');
    setSummary('');
    setInstructions('');
    setEditState({ mode: 'add' });
  };

  const openEdit = (skill: DbSkill) => {
    setName(skill.name);
    setSummary(skill.summary);
    setInstructions(skill.instructions);
    setEditState({ mode: 'edit', skill });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a skill name.');
      return;
    }
    if (editState?.mode === 'add') {
      await createSkill(name.trim(), summary.trim(), instructions.trim());
    } else if (editState?.mode === 'edit') {
      await updateSkill(editState.skill.id, name.trim(), summary.trim(), instructions.trim());
    }
    reload();
    setEditState(null);
  };

  const handleDelete = () => {
    if (editState?.mode !== 'edit') return;
    const skillId = editState.skill.id;
    const skillName = editState.skill.name;
    Alert.alert(
      'Delete skill',
      `Delete "${skillName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSkill(skillId);
            reload();
            setEditState(null);
          },
        },
      ]
    );
  };

  if (editState !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setEditState(null)} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {editState.mode === 'add' ? 'New Skill' : 'Edit Skill'}
            </Text>
            {editState.mode === 'edit' && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteHeaderButton}>
                <Text style={styles.deleteHeaderText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Meeting Notes"
              placeholderTextColor="#c3c6d7"
            />

            <Text style={styles.label}>SUMMARY</Text>
            <TextInput
              style={styles.input}
              value={summary}
              onChangeText={setSummary}
              placeholder="What does this skill do?"
              placeholderTextColor="#c3c6d7"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>INSTRUCTIONS</Text>
            <TextInput
              style={[styles.input, styles.instructionsInput]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Be specific about how the AI should behave..."
              placeholderTextColor="#c3c6d7"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>
                {editState.mode === 'add' ? 'Create Skill' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Skills</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addButton}>
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
          <TouchableOpacity style={styles.skillCard} onPress={() => openEdit(item)}>
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
  flex: { flex: 1 },
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
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    color: '#e5e1e4',
    fontSize: 20,
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
  deleteHeaderButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteHeaderText: {
    color: '#ffb4ab',
    fontWeight: '700',
    ...typography.base,
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
  formContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#adc6ff',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#0e0e10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(67,70,85,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: '#e5e1e4',
    ...typography.base,
  },
  instructionsInput: {
    minHeight: 200,
  },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: '#0f69dc',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveText: {
    color: '#ecf0ff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
