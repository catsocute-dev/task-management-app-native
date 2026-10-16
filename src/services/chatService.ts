import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ChatMessage, SendMessageInput } from '../types/chat';

// In-memory fallback mock messages
let localMockMessages: Record<string, ChatMessage[]> = {
  'mock-team-alpha': [
    {
      id: 'mock-msg-1',
      teamId: 'mock-team-alpha',
      senderId: 'mock-user-1',
      senderName: 'Lead Engineer',
      text: 'Welcome to the team workspace! Let us start working on the exam deliverables.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-msg-2',
      teamId: 'mock-team-alpha',
      senderId: 'mock-user-2',
      senderName: 'Alice Johnson',
      text: 'Thanks! Real-time chat with Firestore onSnapshot works seamlessly.',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

const messageListeners: Record<string, ((msgs: ChatMessage[]) => void)[]> = {};

const notifyListeners = (teamId: string) => {
  const listeners = messageListeners[teamId] || [];
  const current = localMockMessages[teamId] || [];
  listeners.forEach((l) => l([...current]));
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
    return mockId;
  }

  const messagesRef = collection(db, 'teams', input.teamId, 'messages');
  const docRef = await addDoc(messagesRef, newMsgData);
  return docRef.id;
};
