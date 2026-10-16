import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
          } catch (err) {
            console.error('Logout error:', err);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="User Profile"
          subtitle="Manage your personal preferences, account details, and session."
          showStatusBadge={false}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar and Primary Identity */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'Anonymous User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email attached'}</Text>

            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>Authenticated</Text>
            </View>
          </View>

          {/* Account Details Card */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardHeader}>ACCOUNT INFORMATION</Text>

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="person-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.rowLabel}>Full Name</Text>
              </View>
              <Text style={styles.rowValue}>{user?.name || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.rowLabel}>Email</Text>
              </View>
              <Text style={styles.rowValue}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.rowLabel}>Member Since</Text>
              </View>
              <Text style={styles.rowValue}>{formattedDate}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="key-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.rowLabel}>User ID</Text>
              </View>
              <Text style={[styles.rowValue, styles.uidText]} numberOfLines={1}>
                {user?.id ? `${user.id.slice(0, 12)}...` : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Security & System Details */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardHeader}>SECURITY & DATA</Text>

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.success} />
                <Text style={styles.rowLabel}>Authentication</Text>
              </View>
              <Text style={[styles.rowValue, { color: COLORS.success }]}>Firebase Auth</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Ionicons name="cloud-outline" size={16} color={COLORS.primary} />
                <Text style={styles.rowLabel}>Cloud Storage</Text>
              </View>
              <Text style={styles.rowValue}>Cloud Firestore</Text>
            </View>
          </View>

          {/* Logout Action Button */}
          <TouchableOpacity
            style={[styles.logoutBtn, loggingOut && styles.disabledBtn]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    marginTop: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  uidText: {
    maxWidth: 160,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    height: 48,
    marginTop: 24,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
