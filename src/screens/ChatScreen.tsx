import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';
import { Header } from '../components/Header';

interface ChatScreenProps {
  route: any;
  navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route }) => {
  const { teamName } = route.params || { teamName: 'Team Chat' };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title={`${teamName} Chat`} subtitle="Real-time team messaging" showStatusBadge={false} />
        <View style={styles.content}>
          <Text style={styles.text}>Loading chat messages...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, color: COLORS.textMuted },
});
