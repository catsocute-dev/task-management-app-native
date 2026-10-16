import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Team, TeamMember } from '../types/team';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';
import { getTeamById, subscribeTeamMembers } from '../services/teamService';
import { fetchTasksByTeam, createTask, updateTask, deleteTask } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';

interface TeamDetailScreenProps {
  route: any;
  navigation: any;
}

export const TeamDetailScreen: React.FC<TeamDetailScreenProps> = ({ route, navigation }) => {
  const { teamId, teamName: initialTeamName } = route.params;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'tasks'>('members');
  const [loading, setLoading] = useState(true);

  // Task Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load Team details & listen to members
  useEffect(() => {
    let unsubscribeMembers = () => {};

    const loadData = async () => {
      setLoading(true);
      try {
        const teamData = await getTeamById(teamId);
        if (teamData) setTeam(teamData);

        unsubscribeMembers = subscribeTeamMembers(teamId, (updatedMembers) => {
          setMembers(updatedMembers);
        });

        const tasks = await fetchTasksByTeam(teamId);
        setTeamTasks(tasks);
      } catch (err) {
        console.error('Error loading team detail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubscribeMembers();
    };
  }, [teamId]);

  const reloadTasks = async () => {
    try {
      const tasks = await fetchTasksByTeam(teamId);
      setTeamTasks(tasks);
    } catch (err) {
      console.error('Error reloading team tasks:', err);
    }
  };

  const handleShareCode = async () => {
    if (!team?.code) return;
    try {
      await Share.share({
        message: `Join our team "${team.name}" on TaskMaster using invite code: ${team.code}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCreateTask = async (data: CreateTaskInput | UpdateTaskInput) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, data as UpdateTaskInput);
    } else {
      await createTask({
        ...(data as CreateTaskInput),
        teamId: team?.id || teamId,
        teamName: team?.name || initialTeamName,
      });
    }
    await reloadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    await reloadTasks();
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'Done' ? 'To Do' : 'Done';
    await updateTask(task.id, { status: nextStatus });
    await reloadTasks();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {team?.name || initialTeamName}
          </Text>
          <TouchableOpacity
            style={styles.chatNavBtn}
            onPress={() =>
              navigation.navigate('Chat', {
                teamId,
                teamName: team?.name || initialTeamName,
              })
            }
          >
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
            <Text style={styles.chatNavBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.content}>
            {/* Team Header Card */}
            <View style={styles.teamHeaderCard}>
              <View style={styles.headerTop}>
                <View style={styles.teamBadge}>
                  <Ionicons name="people" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.teamMeta}>
                  <Text style={styles.teamTitle}>{team?.name || initialTeamName}</Text>
                  {Boolean(team?.description) && (
                    <Text style={styles.teamDescription}>{team?.description}</Text>
                  )}
                </View>
              </View>

              {/* Invite Code row */}
              {Boolean(team?.code) && (
                <View style={styles.codeRow}>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>INVITE CODE</Text>
                    <Text style={styles.codeValue}>{team?.code}</Text>
                  </View>
                  <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
                    <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.shareBtnText}>Share Code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Segmented Tab Switcher */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
                onPress={() => setActiveTab('members')}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={activeTab === 'members' ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
                  Members ({members.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
                onPress={() => setActiveTab('tasks')}
              >
                <Ionicons
                  name="checkbox-outline"
                  size={16}
                  color={activeTab === 'tasks' ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
                  Tasks ({teamTasks.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 1: Members List */}
            {activeTab === 'members' && (
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(item.userName || item.userEmail || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.userName || 'Member'}</Text>
                      <Text style={styles.memberEmail}>{item.userEmail}</Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        item.role === 'owner' ? styles.ownerBadge : styles.memberRoleBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          item.role === 'owner' ? styles.ownerText : styles.memberRoleText,
                        ]}
                      >
                        {item.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Tab 2: Team Tasks List */}
            {activeTab === 'tasks' && (
              <View style={styles.taskTabContainer}>
                <View style={styles.taskTabHeader}>
                  <Text style={styles.taskTabTitle}>Team Tasks</Text>
                  <TouchableOpacity
                    style={styles.addTaskBtn}
                    onPress={() => {
                      setSelectedTask(null);
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addTaskText}>Add Task</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={teamTasks}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyTaskBox}>
                      <Ionicons name="clipboard-outline" size={36} color={COLORS.textMuted} />
                      <Text style={styles.emptyTaskText}>No tasks assigned to this team yet.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <TaskCard
                      task={item}
                      onEdit={(t) => {
                        setSelectedTask(t);
                        setModalVisible(true);
                      }}
                      onDelete={handleDeleteTask}
                      onToggleStatus={handleToggleStatus}
                    />
                  )}
                />
              </View>
            )}
          </View>
        )}

        {/* Create / Edit Task Modal for this team */}
        <TaskModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleCreateTask}
          initialTask={selectedTask}
          defaultTeamId={teamId}
          defaultTeamName={team?.name || initialTeamName}
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
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  chatNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chatNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  teamHeaderCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  teamBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamMeta: {
    flex: 1,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  teamDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  codeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
  },
  memberRoleBadge: {
    backgroundColor: '#F1F5F9',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ownerText: {
    color: '#D97706',
  },
  memberRoleText: {
    color: COLORS.textMuted,
  },
  taskTabContainer: {
    flex: 1,
  },
  taskTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  taskTabTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  addTaskText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyTaskBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTaskText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
