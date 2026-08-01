import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Droplets, Plus, Trash2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import {
  useWaterStore,
  hydrateWaterStore,
  type WaterContainer,
} from '../../stores/waterStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function WaterSettingsSection() {
  const db = useSQLiteContext();
  const { dailyGoal, containers } = useWaterStore();
  const { showConfirm } = useCustomAlert();

  const [goalInput, setGoalInput] = useState(dailyGoal.toString());
  const [editingGoal, setEditingGoal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [addingContainer, setAddingContainer] = useState(false);

  async function handleSaveGoal() {
    const val = parseInt(goalInput, 10);
    if (isNaN(val) || val < 500 || val > 10000) {
      setGoalInput(dailyGoal.toString());
      setEditingGoal(false);
      return;
    }
    try {
      await db.runAsync(
        'UPDATE user_profile SET water_goal_ml = ?, updated_at = ? WHERE id = 1',
        [val, new Date().toISOString()]
      );
      useWaterStore.setState({ dailyGoal: val });
      setEditingGoal(false);
    } catch (e) {
      console.error('Failed to save water goal:', e);
    }
  }

  async function handleAddContainer() {
    const cap = parseInt(newCapacity, 10);
    if (!newName.trim() || isNaN(cap) || cap < 10) return;

    try {
      const now = Date.now();
      const sortOrder = containers.length;
      await db.runAsync(
        `INSERT INTO water_containers (name, capacity_ml, sort_order, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`,
        [newName.trim(), cap, sortOrder, now, now]
      );
      setNewName('');
      setNewCapacity('');
      setAddingContainer(false);
      await hydrateWaterStore(db);
    } catch (e) {
      console.error('Failed to add container:', e);
    }
  }

  async function handleDeleteContainer(container: WaterContainer) {
    showConfirm(
      'Remove Container',
      `Remove "${container.name}"? Past logs will be kept.`,
      async () => {
        try {
          await db.runAsync(
            'UPDATE water_containers SET is_deleted = 1, updated_at = ? WHERE id = ?',
            [Date.now(), container.id]
          );
          await hydrateWaterStore(db);
        } catch (e) {
          console.error('Failed to delete container:', e);
        }
      },
      'Remove',
      true
    );
  }

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Droplets size={20} color={COLORS.water} />
        <Text style={styles.title}>Water</Text>
      </View>

      <Card style={styles.card}>
        {/* Daily goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          {editingGoal ? (
            <View style={styles.editRow}>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                placeholder="e.g. 2400"
                style={styles.input}
                autoFocus
              />
              <Text style={styles.unit}>ml</Text>
              <View style={styles.editActions}>
                <Button label="Save" onPress={handleSaveGoal} variant="primary" accentColor={COLORS.water} size="sm" />
                <Button label="Cancel" onPress={() => { setGoalInput(dailyGoal.toString()); setEditingGoal(false); }} variant="ghost" size="sm" />
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.value}>{dailyGoal >= 1000 ? `${(dailyGoal / 1000).toFixed(1)}L` : `${dailyGoal}ml`}</Text>
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Containers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Containers</Text>

          {containers.length === 0 && (
            <Text style={styles.emptyText}>No containers yet. Add one below.</Text>
          )}

          {containers.map((c) => (
            <View key={c.id} style={styles.containerRow}>
              <View style={styles.containerInfo}>
                <Text style={styles.containerName}>{c.name}</Text>
                <Text style={styles.containerCap}>{c.capacity_ml}ml</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteContainer(c)} hitSlop={8}>
                <Trash2 size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add container */}
          {addingContainer ? (
            <View style={styles.addForm}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Name (e.g. Glass)"
                style={styles.addInput}
                autoFocus
              />
              <TextInput
                value={newCapacity}
                onChangeText={setNewCapacity}
                placeholder="ml (e.g. 250)"
                keyboardType="number-pad"
                style={styles.addInput}
              />
              <View style={styles.editActions}>
                <Button label="Add" onPress={handleAddContainer} variant="primary" accentColor={COLORS.water} size="sm" />
                <Button label="Cancel" onPress={() => { setNewName(''); setNewCapacity(''); setAddingContainer(false); }} variant="ghost" size="sm" />
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddingContainer(true)}>
              <Plus size={16} color={COLORS.water} />
              <Text style={styles.addBtnText}>Add Container</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  card: { gap: SPACING.xl },
  section: { gap: SPACING.sm },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  editBtn: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.water,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  input: { flex: 1, minWidth: 80 },
  unit: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  containerInfo: { gap: 2 },
  containerName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  containerCap: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  addForm: { gap: SPACING.sm },
  addInput: { width: '100%' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.water,
    alignSelf: 'flex-start',
  },
  addBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.water,
  },
});
