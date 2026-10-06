import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTasks } from '../hooks/useTasks';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { StatusFilter, FilterOption } from '../components/StatusFilter';
import { EmptyState } from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export const HomeScreen: React.FC = () => {
  const { tasks, loading, refreshing, addTask, editTask, removeTask, handleRefresh } = useTasks();

  const [filter, setFilter] = useState<FilterOption>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Compute status counts
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'To Do').length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      done: tasks.filter((t) => t.status === 'Done').length,
    };
  }, [tasks]);

  // Filter & search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = filter === 'All' || task.status === filter;
      const matchesQuery =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [tasks, filter, searchQuery]);

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'Done' ? 'To Do' : 'Done';
    await editTask(task.id, { status: nextStatus });
  };

  const handleModalSubmit = async (data: CreateTaskInput | UpdateTaskInput) => {
    if (selectedTask) {
      await editTask(selectedTask.id, data as UpdateTaskInput);
    } else {
      await addTask(data as CreateTaskInput);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.responsiveContainer}>
        {/* App Header with short description & connection indicator */}
        <Header />

        {/* Action Controls: Search + Add Task Button */}
        <View style={styles.controlSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>New Task</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Chips */}
        <StatusFilter currentFilter={filter} onSelectFilter={setFilter} counts={counts} />

        {/* Task List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Syncing tasks from Firestore...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                message={
                  searchQuery
                    ? `No tasks matching "${searchQuery}"`
                    : filter !== 'All'
                      ? `No tasks in "${filter}" status`
                      : 'No tasks found. Create a new task to get started!'
                }
                onAction={handleOpenCreateModal}
              />
            }
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                onEdit={handleOpenEditModal}
                onDelete={removeTask}
                onToggleStatus={handleToggleStatus}
              />
            )}
          />
        )}

        {/* Create / Edit Modal */}
        <TaskModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleModalSubmit}
          initialTask={selectedTask}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  controlSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 14,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 4,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
