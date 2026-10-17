import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
        pushToken: data.pushToken || null,
        lastSeen: data.lastSeen || null,
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
 * Sign in using Google OAuth Credentials.
 */
export const loginWithGoogle = async (
  idToken: string,
  accessToken?: string
): Promise<UserProfile> => {
  if (!isFirebaseConfigured() || !auth || !db) {
    const mockProfile: UserProfile = {
      id: 'mock-google-user',
      name: 'Google User',
      email: 'user@google.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString(),
    };
    localMockUser = mockProfile;
    notifyAuthListeners();
    return mockProfile;
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await signInWithCredential(auth, credential);
  const fbUser = userCredential.user;

  let profile = await getUserProfile(fbUser.uid);
  if (!profile) {
    profile = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
      email: fbUser.email || '',
      avatarUrl: fbUser.photoURL || null,
      createdAt: new Date().toISOString(),
    };
    const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
    await setDoc(userRef, profile);
  } else if (!profile.avatarUrl && fbUser.photoURL) {
    profile.avatarUrl = fbUser.photoURL;
    const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
    await updateDoc(userRef, { avatarUrl: fbUser.photoURL });
  }

  return profile;
};

/**
 * Upload profile picture to Cloudinary and update user profile in Firestore.
 */
export const uploadProfilePicture = async (
  userId: string,
  imageUri: string
): Promise<string> => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

  let downloadUrl = imageUri;

  if (cloudName && uploadPreset && !cloudName.includes('your_cloudinary')) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `avatar_${userId}_${Date.now()}.jpg`,
    } as any);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'taskmaster_avatars');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Cloudinary upload error:', errText);
      throw new Error(`Cloudinary upload failed: ${res.statusText || 'Check upload preset'}`);
    }

    const data = await res.json();
    if (!data.secure_url) {
      throw new Error('Cloudinary response did not return a valid secure_url');
    }
    downloadUrl = data.secure_url;
  } else {
    console.warn(
      'Cloudinary credentials missing in .env (EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME / EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET). Using local URI fallback.'
    );
  }

  // Update in Firestore
  if (isFirebaseConfigured() && db) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { avatarUrl: downloadUrl });
  }

  // Update in Firebase Auth
  if (auth?.currentUser) {
    try {
      await updateProfile(auth.currentUser, { photoURL: downloadUrl });
    } catch (e) {
      console.warn('Could not update Auth photoURL:', e);
    }
  }

  // Update local mock user for preview/offline mode
  if (localMockUser && localMockUser.id === userId) {
    localMockUser = { ...localMockUser, avatarUrl: downloadUrl };
    notifyAuthListeners();
  }

  return downloadUrl;
};

/**
 * Update user last seen timestamp.
 */
export const updateUserLastSeen = async (userId: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { lastSeen: new Date().toISOString() });
  } catch {
    // Non-fatal
  }
};

/**
 * Update arbitrary fields in a user profile.
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  if (!isFirebaseConfigured() || !db) {
    if (localMockUser && localMockUser.id === userId) {
      localMockUser = { ...localMockUser, ...updates };
      notifyAuthListeners();
    }
    return;
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, updates);
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
        avatarUrl: fbUser.photoURL || null,
        createdAt: new Date().toISOString(),
      });
    }
  });
};

