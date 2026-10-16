import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { UserProfile, SignUpInput, AuthCredentials } from '../types/auth';

const USERS_COLLECTION = 'users';

// In-memory fallback mock user when Firebase credentials are not set
let localMockUser: UserProfile | null = null;
const authListeners: ((user: UserProfile | null) => void)[] = [];

const notifyAuthListeners = () => {
  authListeners.forEach((listener) => listener(localMockUser));
};

/**
 * Fetch a user profile document from Firestore `users/{uid}`.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured() || !db) {
    return localMockUser;
  }

  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        name: data.name || 'User',
        email: data.email || '',
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt || new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Sign up a new user with Email and Password.
 * Creates an Auth user and a matching profile document in `users` collection.
 */
export const signUp = async (input: SignUpInput): Promise<UserProfile> => {
  const name = input.name.trim();
  const email = input.email.trim();
  const password = input.password;

  if (!isFirebaseConfigured() || !auth || !db) {
    const mockProfile: UserProfile = {
      id: `mock-user-${Date.now()}`,
      name,
      email,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    localMockUser = mockProfile;
    notifyAuthListeners();
    return mockProfile;
  }

  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  // 2. Set display name in Auth profile
  try {
    await updateProfile(fbUser, { displayName: name });
  } catch (err) {
    console.warn('Could not update Auth displayName:', err);
  }

  // 3. Create document in `users` collection
  const newProfile: UserProfile = {
    id: fbUser.uid,
    name,
    email: fbUser.email || email,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };

  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  await setDoc(userRef, newProfile);

  return newProfile;
};

/**
 * Sign in existing user with Email and Password.
 */
export const login = async (credentials: AuthCredentials): Promise<UserProfile> => {
  const email = credentials.email.trim();
  const password = credentials.password;

  if (!isFirebaseConfigured() || !auth || !db) {
    const mockProfile: UserProfile = {
      id: 'mock-user-1',
      name: email.split('@')[0] || 'Demo User',
      email,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    localMockUser = mockProfile;
    notifyAuthListeners();
    return mockProfile;
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;

  // Retrieve existing user profile
  let profile = await getUserProfile(fbUser.uid);

  // If profile doc doesn't exist, create it automatically
  if (!profile) {
    profile = {
      id: fbUser.uid,
      name: fbUser.displayName || email.split('@')[0] || 'User',
      email: fbUser.email || email,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
    await setDoc(userRef, profile);
  }

  return profile;
};

/**
 * Sign out current user.
 */
export const logout = async (): Promise<void> => {
  if (!isFirebaseConfigured() || !auth) {
    localMockUser = null;
    notifyAuthListeners();
    return;
  }

  await signOut(auth);
};

/**
 * Subscribe to authentication state changes.
 */
export const subscribeAuthState = (
  onUserChanged: (user: UserProfile | null) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !auth) {
    onUserChanged(localMockUser);
    authListeners.push(onUserChanged);
    return () => {
      const idx = authListeners.indexOf(onUserChanged);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  }

  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      onUserChanged(null);
      return;
    }

    const profile = await getUserProfile(fbUser.uid);
    if (profile) {
      onUserChanged(profile);
    } else {
      // Fallback profile if Firestore document isn't created yet
      onUserChanged({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      });
    }
  });
};
