import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';

export const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="User Profile"
          subtitle="Manage your personal preferences, account details, and notification rules."
          showStatusBadge={false}
        />

        <View style={styles.content}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={48} color={COLORS.primary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
          <Text style={styles.title}>Account & Authentication</Text>
          <Text style={styles.description}>
            Authentication (Firebase Auth), user registration, and personal profiles will be
            implemented in Practical Exam 2.
          </Text>

          <View style={styles.cardInfo}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Current Mode</Text>
              <Text style={styles.rowValue}>Public / Guest Mode</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Auth State</Text>
              <Text style={styles.rowValue}>No Login Required (Exam 1)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Database</Text>
              <Text style={styles.rowValue}>Cloud Firestore</Text>
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
  avatarCircle: {
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
  cardInfo: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },
});
