import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';

export const TeamsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Teams & Collaboration"
          subtitle="Work together, assign tasks, and monitor workspace activity."
          showStatusBadge={false}
        />

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={48} color={COLORS.primary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
          <Text style={styles.title}>Team Workspaces</Text>
          <Text style={styles.description}>
            Team collaboration and shared workspaces will be introduced in Practical Exam 2. You
            will be able to invite team members, assign task owners, and track team velocity.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Shared Team task boards</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Assignee IDs & Task delegation</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.featureText}>Role-based workspace access</Text>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
});
