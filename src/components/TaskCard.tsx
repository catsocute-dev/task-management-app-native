import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Task } from '../types/task';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Done':
        return { text: COLORS.statusDone, bg: COLORS.statusDoneBg };
      case 'In Progress':
        return { text: COLORS.statusInProgress, bg: COLORS.statusInProgressBg };
      default:
        return { text: COLORS.statusTodo, bg: COLORS.statusTodoBg };
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'High':
        return { text: COLORS.priorityHigh, bg: COLORS.priorityHighBg };
      case 'Low':
        return { text: COLORS.priorityLow, bg: COLORS.priorityLowBg };
      default:
        return { text: COLORS.priorityMedium, bg: COLORS.priorityMediumBg };
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(task.id),
        },
      ]
    );
  };

  const statusColors = getStatusColor(task.status);
  const priorityColors = getPriorityColor(task.priority);
  const isDone = task.status === 'Done';

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Top Header: Checkbox + Title + Actions */}
      <View style={styles.headerRow}>
        {onToggleStatus && (
          <TouchableOpacity
            style={[styles.checkbox, isDone && styles.checkboxDone]}
            onPress={() => onToggleStatus(task)}
            activeOpacity={0.7}
          >
            {isDone && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </TouchableOpacity>
        )}

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.title, isDone && styles.titleDone]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDeletePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {Boolean(task.description) && (
        <Text style={[styles.description, isDone && styles.descriptionDone]} numberOfLines={3}>
          {task.description}
        </Text>
      )}

      {/* Badges & Due Date footer */}
      <View style={styles.footerRow}>
        <View style={styles.badgesGroup}>
          <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.badgeText, { color: statusColors.text }]}>
              {task.status}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: priorityColors.bg }]}>
            <Text style={[styles.badgeText, { color: priorityColors.text }]}>
              {task.priority}
            </Text>
          </View>
        </View>

        {Boolean(task.dueDate) && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.dateText}>{task.dueDate}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: COLORS.statusDone,
    borderColor: COLORS.statusDone,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 22,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerBg,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  descriptionDone: {
    color: '#94A3B8',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
