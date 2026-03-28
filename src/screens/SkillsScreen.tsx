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
import { useNavigation } from '@react-navigation/native';

import { listSkills, createSkill, updateSkill, deleteSkill, type DbSkill } from '../db';
import { colors, radius, spacing, typography } from '../theme';

type EditState = { mode: 'add' } | { mode: 'edit'; skill: DbSkill };

export default function SkillsScreen() {
  const navigation = useNavigation();
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
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Meeting Notes"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.label}>Summary</Text>
            <TextInput
              style={styles.input}
              value={summary}
              onChangeText={setSummary}
              placeholder="Brief description shown to AI in every conversation"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.instructionsInput]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Full instructions the AI receives when it calls read_skill"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />

            {editState.mode === 'edit' && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete Skill</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Skills</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addButton}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={skills}
        keyExtractor={item => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No skills yet. Tap + to add one.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.skillRow} onPress={() => openEdit(item)}>
            <View style={styles.skillRowContent}>
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
  addButton: {
    padding: spacing.sm,
  },
  addText: {
    color: '#fafafa',
    fontSize: 24,
    fontWeight: '300',
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  saveText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
  separator: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: spacing.md,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  skillRowContent: {
    flex: 1,
  },
  skillName: {
    ...typography.base,
    color: '#fafafa',
    fontWeight: '500',
  },
  skillSummary: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  chevron: {
    color: colors.mutedForeground,
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  emptyText: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.md * 3,
  },
  formContent: {
    padding: spacing.md,
  },
  label: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#fafafa',
    ...typography.base,
  },
  instructionsInput: {
    minHeight: 200,
  },
  deleteButton: {
    marginTop: spacing.md * 2,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: '600',
    ...typography.base,
  },
});
