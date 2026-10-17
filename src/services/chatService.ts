import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ChatMessage, SendMessageInput } from '../types/chat';
import { sendLocalNotification } from './notificationService';

// In-memory fallback mock messages
let localMockMessages: Record<string, ChatMessage[]> = {
  'mock-team-alpha': [
    {
      id: 'mock-msg-1',
      teamId: 'mock-team-alpha',
      senderId: 'mock-user-1',
      senderName: 'Lead Engineer',
      senderAvatarUrl: null,
      text: 'Welcome to the team workspace! Let us start working on the exam deliverables.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-msg-2',
      teamId: 'mock-team-alpha',
      senderId: 'mock-user-2',
      senderName: 'Alice Johnson',
      senderAvatarUrl: null,
      text: 'Thanks! Real-time chat with Firestore onSnapshot works seamlessly.',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

const messageListeners: Record<string, ((msgs: ChatMessage[]) => void)[]> = {};
const typingListeners: Record<string, ((users: string[]) => void)[]> = {};
let localMockTyping: Record<string, Record<string, { userName: string; timestamp: number }>> = {};

const notifyListeners = (teamId: string) => {
  const listeners = messageListeners[teamId] || [];
  const current = localMockMessages[teamId] || [];
  listeners.forEach((l) => l([...current]));
};

const notifyTypingListeners = (teamId: string, excludeUserId?: string) => {
  const listeners = typingListeners[teamId] || [];
  const teamTyping = localMockTyping[teamId] || {};
  const now = Date.now();
  const typingNames: string[] = [];

  Object.entries(teamTyping).forEach(([uid, data]) => {
    if (uid !== excludeUserId && now - data.timestamp < 4000) {
      typingNames.push(data.userName);
    }
  });

  listeners.forEach((l) => l(typingNames));
};

/**
 * Subscribe to real-time chat messages for a specific team.
 * Stored in Firestore subcollection: `teams/{teamId}/messages`.
 */
export const subscribeToTeamMessages = (
  teamId: string,
  onNext: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    if (!localMockMessages[teamId]) localMockMessages[teamId] = [];
    onNext([...localMockMessages[teamId]]);

    if (!messageListeners[teamId]) messageListeners[teamId] = [];
    messageListeners[teamId].push(onNext);

    return () => {
      const idx = messageListeners[teamId]?.indexOf(onNext) ?? -1;
      if (idx !== -1) messageListeners[teamId].splice(idx, 1);
    };
  }

  try {
    const messagesRef = collection(db, 'teams', teamId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            teamId,
            senderId: d.senderId || '',
            senderName: d.senderName || 'Anonymous',
            senderAvatarUrl: d.senderAvatarUrl || null,
            text: d.text || '',
            createdAt: d.createdAt || new Date().toISOString(),
          };
        });
        onNext(messages);
      },
      (error) => {
        console.error('Snapshot error for team chat:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error('Error listening to team chat:', err);
    if (onError) onError(err as Error);
    return () => {};
  }
};

/**
 * Send a new chat message to a team's subcollection.
 */
export const sendTeamMessage = async (input: SendMessageInput): Promise<string> => {
  const newMsgData = {
    senderId: input.senderId,
    senderName: input.senderName,
    senderAvatarUrl: input.senderAvatarUrl || null,
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured() || !db) {
    const mockId = `mock-msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      ...newMsgData,
      id: mockId,
      teamId: input.teamId,
    };
    if (!localMockMessages[input.teamId]) localMockMessages[input.teamId] = [];
    localMockMessages[input.teamId].push(newMsg);
    notifyListeners(input.teamId);

    // Provide feedback notification
    sendLocalNotification(
      `💬 New message from ${input.senderName}`,
      input.text.trim().slice(0, 80),
      { teamId: input.teamId }
    );

    return mockId;
  }

  const messagesRef = collection(db, 'teams', input.teamId, 'messages');
  const docRef = await addDoc(messagesRef, newMsgData);

  return docRef.id;
};

/**
 * Broadcast current user typing status to `teams/{teamId}/typing/{userId}`
 */
export const setUserTypingStatus = async (
  teamId: string,
  user: { id: string; name: string },
  isTyping: boolean
): Promise<void> => {
  if (!isFirebaseConfigured() || !db) {
    if (!localMockTyping[teamId]) localMockTyping[teamId] = {};
    if (isTyping) {
      localMockTyping[teamId][user.id] = { userName: user.name, timestamp: Date.now() };
    } else {
      delete localMockTyping[teamId][user.id];
    }
    notifyTypingListeners(teamId, user.id);
    return;
  }

  try {
    const typingDocRef = doc(db, 'teams', teamId, 'typing', user.id);
    await setDoc(typingDocRef, {
      userId: user.id,
      userName: user.name,
      isTyping,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error setting typing status:', err);
  }
};

/**
 * Subscribe to teammates typing in real-time.
 */
export const subscribeToTeamTyping = (
  teamId: string,
  currentUserId: string,
  onNext: (typingUserNames: string[]) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    if (!typingListeners[teamId]) typingListeners[teamId] = [];
    typingListeners[teamId].push(onNext);

    notifyTypingListeners(teamId, currentUserId);

    return () => {
      const idx = typingListeners[teamId]?.indexOf(onNext) ?? -1;
      if (idx !== -1) typingListeners[teamId].splice(idx, 1);
    };
  }

  try {
    const typingColRef = collection(db, 'teams', teamId, 'typing');
    return onSnapshot(typingColRef, (snapshot) => {
      const now = Date.now();
      const typingNames: string[] = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId !== currentUserId && data.isTyping) {
          const updatedTime = new Date(data.updatedAt).getTime();
          // Filter out stale typing states (> 5 seconds)
          if (!isNaN(updatedTime) && now - updatedTime < 6000) {
            typingNames.push(data.userName || 'Teammate');
          }
        }
      });

      onNext(typingNames);
    });
  } catch (err) {
    console.warn('Error subscribing to typing indicators:', err);
    return () => {};
  }
};

