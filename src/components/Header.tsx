import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { isFirebaseConfigured } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showStatusBadge?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Task Manager',
  subtitle = 'Organize, track, and complete your daily tasks seamlessly.',
  showStatusBadge = true,
}) => {
  const isConnected = isFirebaseConfigured();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconBadge}>
            <Ionicons name="checkbox" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {showStatusBadge && (
          <View
            style={[
              styles.connectionBadge,
              { backgroundColor: isConnected ? COLORS.statusDoneBg : COLORS.statusTodoBg },
            ]}
          >
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? COLORS.statusDone : COLORS.statusTodo },
              ]}
            />
            <Text
              style={[
                styles.connectionText,
                { color: isConnected ? COLORS.statusDone : COLORS.statusTodo },
              ]}
            >
              {isConnected ? 'Firestore Connected' : 'Local Preview'}
            </Text>
          </View>
        )}
      </View>

      {Boolean(subtitle) && <Text style={styles.subtitle}>{subtitle}</Text>}

      {!isConnected && (
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={18} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Running in preview mode. Set your Firebase keys in{' '}
            <Text style={styles.boldText}>.env</Text> to connect Cloud Firestore.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: -0.3,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
  },
});
