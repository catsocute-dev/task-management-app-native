import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { Team } from '../types/team';
import {
  subscribeUserTeams,
  createTeam,
  joinTeamByCode,
} from '../services/teamService';

interface TeamsScreenProps {
  navigation: any;
}

export const TeamsScreen: React.FC<TeamsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Team Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Join Team Modal State
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Listen to user's teams in real-time
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeUserTeams(
      user.id,
      (updatedTeams) => {
        setTeams(updatedTeams);
        setLoading(false);
      },
      (err) => {
        console.error('Teams subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const handleCreateTeam = async () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a team name.');
      return;
    }
    if (!user) return;

    try {
      setCreating(true);
      const created = await createTeam(
        {
          name: trimmed,
          description: teamDesc.trim(),
        },
        user
      );
      setCreateModalVisible(false);
      setTeamName('');
      setTeamDesc('');
      navigation.navigate('TeamDetail', {
        teamId: created.id,
        teamName: created.name,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Required', 'Please enter a 6-character team code.');
      return;
    }
    if (!user) return;

    try {
      setJoining(true);
      const team = await joinTeamByCode(code, user);
      setJoinModalVisible(false);
      setJoinCode('');
      navigation.navigate('TeamDetail', {
        teamId: team.id,
        teamName: team.name,
      });
    } catch (err: any) {
      Alert.alert('Failed to Join', err?.message || 'Invalid team code.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Team Workspaces"
          subtitle="Collaborate on tasks, invite members, and chat in real-time."
          showStatusBadge={true}
        />

        {/* Top Controls: Create Team & Join Team */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.createBtn]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.joinBtn]}
            onPress={() => setJoinModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="enter-outline" size={18} color={COLORS.primary} />
            <Text style={styles.joinBtnText}>Join with Code</Text>
          </TouchableOpacity>
        </View>

        {/* Team List or Empty State */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Syncing your teams...</Text>
          </View>
        ) : (
          <FlatList
            data={teams}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={42} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Teams Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first team workspace or join an existing one using an invite code.
                </Text>
                <View style={styles.emptyActions}>
                  <TouchableOpacity
                    style={styles.emptyCreateBtn}
                    onPress={() => setCreateModalVisible(true)}
                  >
                    <Text style={styles.emptyCreateBtnText}>Create a Team</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.teamCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('TeamDetail', {
                    teamId: item.id,
                    teamName: item.name,
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.teamIconBox}>
                    <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.titleArea}>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.codeBadge}>
                      <Ionicons name="key-outline" size={12} color="#D97706" />
                      <Text style={styles.codeText}>{item.code}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                </View>

                {Boolean(item.description) && (
                  <Text style={styles.teamDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.footerText}>Team Workspace</Text>
                  </View>
                  <Text style={styles.openText}>View Details →</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Modal: Create Team */}
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Team</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Team Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Design Studio Alpha"
                  placeholderTextColor="#94A3B8"
                  value={teamName}
                  onChangeText={setTeamName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="What is this team working on?"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={teamDesc}
                  onChangeText={setTeamDesc}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={creating}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, creating && styles.disabledBtn]}
                  onPress={handleCreateTeam}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Create Team</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal: Join Team by Code */}
        <Modal
          visible={joinModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setJoinModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join Team</Text>
                <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Enter the 6-character team invite code shared by the team owner.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Invite Code *</Text>
                <TextInput
                  style={[styles.formInput, styles.codeInput]}
                  placeholder="e.g. AB12CD"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={joinCode}
                  onChangeText={setJoinCode}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setJoinModalVisible(false)}
                  disabled={joining}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, joining && styles.disabledBtn]}
                  onPress={handleJoinTeam}
                  disabled={joining}
                >
                  {joining ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Join Workspace</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    gap: 8,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  joinBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  teamDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyActions: {
    marginTop: 18,
  },
  emptyCreateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: COLORS.textDark,
  },
  formTextArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  codeInput: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
