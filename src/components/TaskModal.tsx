import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput } from '../types/task';
import { COLORS, TASK_STATUSES, TASK_PRIORITIES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Team, TeamMember } from '../types/team';
import { subscribeUserTeams, getTeamMembers } from '../services/teamService';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  initialTask?: Task | null;
  defaultTeamId?: string | null;
  defaultTeamName?: string | null;
}

interface TaskModalFormProps {
  initialTask?: Task | null;
  defaultTeamId?: string | null;
  defaultTeamName?: string | null;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
}

const TaskModalForm: React.FC<TaskModalFormProps> = ({
  initialTask,
  defaultTeamId,
  defaultTeamName,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || 'To Do');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'Medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || '');

  // Team & Assignee state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    initialTask?.teamId || defaultTeamId || null
  );
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(
    initialTask?.teamName || defaultTeamName || null
  );
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    initialTask?.assigneeId || null
  );
  const [selectedAssigneeName, setSelectedAssigneeName] = useState<string | null>(
    initialTask?.assigneeName || null
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [titleError, setTitleError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Subscribe to user teams
  useEffect(() => {
    if (!user?.id) return;

    const unsub = subscribeUserTeams(user.id, (userTeams) => {
      setTeams(userTeams);
      if (defaultTeamId) {
        const found = userTeams.find((t) => t.id === defaultTeamId);
        if (found) setSelectedTeamName(found.name);
      }
    });

    return () => unsub();
  }, [user?.id, defaultTeamId]);

  // Load team members when team changes
  useEffect(() => {
    if (!selectedTeamId) return;

    let isMounted = true;

    getTeamMembers(selectedTeamId)
      .then((mList) => {
        if (isMounted) {
          setMembers(mList);
          // If editing and assignee matches, keep it
          if (initialTask?.assigneeId) {
            const found = mList.find((m) => m.userId === initialTask.assigneeId);
            if (found) {
              setSelectedAssigneeName(found.userName || found.userEmail);
            }
          }
        }
      })
      .catch((err) => console.error('Error fetching members:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedTeamId, initialTask?.assigneeId]);

  const setRelativeDueDate = (daysAhead: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    setDueDate(targetDate.toISOString().split('T')[0]);
  };

  const handleSelectTeam = (t: Team | null) => {
    if (!t) {
      setSelectedTeamId(null);
      setSelectedTeamName(null);
      setSelectedAssigneeId(null);
      setSelectedAssigneeName(null);
      setMembers([]);
    } else {
      setSelectedTeamId(t.id);
      setSelectedTeamName(t.name);
      setSelectedAssigneeId(null);
      setSelectedAssigneeName(null);
    }
  };

  const handleSelectAssignee = (m: TeamMember | null) => {
    if (!m) {
      setSelectedAssigneeId(null);
      setSelectedAssigneeName(null);
    } else {
      setSelectedAssigneeId(m.userId);
      setSelectedAssigneeName(m.userName || m.userEmail);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Task title is required.');
      return;
    }

    try {
      setSubmitting(true);
      setTitleError('');

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate.trim() || null,
        teamId: selectedTeamId,
        teamName: selectedTeamName,
        assigneeId: selectedAssigneeId,
        assigneeName: selectedAssigneeName,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to save task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.modalTitle}>{isEditing ? 'Edit Task' : 'Create New Task'}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Title Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, Boolean(titleError) && styles.inputError]}
            placeholder="e.g. Design UI Wireframes"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleError) setTitleError('');
            }}
          />
          {Boolean(titleError) && <Text style={styles.errorText}>{titleError}</Text>}
        </View>

        {/* Description Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add more details about this task..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Team Assignment Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Assign to Team</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !selectedTeamId && styles.chipSelected]}
              onPress={() => handleSelectTeam(null)}
            >
              <Text style={[styles.chipText, !selectedTeamId && styles.chipTextSelected]}>
                Personal (No Team)
              </Text>
            </TouchableOpacity>

            {teams.map((t) => {
              const isSelected = selectedTeamId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => handleSelectTeam(t)}
                >
                  <Ionicons
                    name="people-outline"
                    size={14}
                    color={isSelected ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Assignee Member Selector (shown when team is selected) */}
        {Boolean(selectedTeamId) && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Assignee</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedAssigneeId && styles.chipSelected]}
                onPress={() => handleSelectAssignee(null)}
              >
                  <Text style={[styles.chipText, !selectedAssigneeId && styles.chipTextSelected]}>
                    Unassigned
                  </Text>
                </TouchableOpacity>

                {members.map((m) => {
                  const isSelected = selectedAssigneeId === m.userId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => handleSelectAssignee(m)}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={15}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {m.userName || m.userEmail}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
          </View>
        )}

        {/* Status Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.optionRow}>
            {TASK_STATUSES.map((item) => {
              const isSelected = status === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => setStatus(item.value)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.optionRow}>
            {TASK_PRIORITIES.map((item) => {
              const isSelected = priority === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => setPriority(item.value)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Due Date Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-15"
            placeholderTextColor="#94A3B8"
            value={dueDate}
            onChangeText={setDueDate}
          />
          <View style={styles.quickDateRow}>
            <TouchableOpacity style={styles.quickDateBtn} onPress={() => setRelativeDueDate(0)}>
              <Text style={styles.quickDateText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDateBtn} onPress={() => setRelativeDueDate(1)}>
              <Text style={styles.quickDateText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDateBtn} onPress={() => setRelativeDueDate(7)}>
              <Text style={styles.quickDateText}>In 1 Week</Text>
            </TouchableOpacity>
            {Boolean(dueDate) && (
              <TouchableOpacity
                style={[styles.quickDateBtn, styles.clearDateBtn]}
                onPress={() => setDueDate('')}
              >
                <Text style={[styles.quickDateText, { color: COLORS.danger }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Create Task'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialTask,
  defaultTeamId,
  defaultTeamName,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {visible && (
          <TaskModalForm
            key={initialTask ? `edit-${initialTask.id}` : 'create-new'}
            initialTask={initialTask}
            defaultTeamId={defaultTeamId}
            defaultTeamName={defaultTeamName}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.borderLight,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  requiredMark: {
    color: COLORS.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    minHeight: 70,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  optionChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
  clearDateBtn: {
    backgroundColor: COLORS.dangerBg,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
