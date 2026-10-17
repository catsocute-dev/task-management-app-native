import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AuthCredentials, SignUpInput } from '../types/auth';
import {
  subscribeAuthState,
  login as apiLogin,
  signUp as apiSignUp,
  logout as apiLogout,
  loginWithGoogle as apiLoginWithGoogle,
  uploadProfilePicture as apiUploadProfilePicture,
  updateUserLastSeen,
  getUserProfile,
} from '../services/authService';
import {
  registerForPushNotificationsAsync,
  saveUserPushToken,
} from '../services/notificationService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  loginWithGoogle: (idToken: string, accessToken?: string) => Promise<void>;
  updateAvatar: (imageUri: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((profile) => {
      setUser(profile);
      setLoading(false);

      if (profile?.id) {
        // Register push token in background
        registerForPushNotificationsAsync()
          .then((token) => {
            if (token) {
              saveUserPushToken(profile.id, token);
            }
          })
          .catch(() => {});

        // Update last seen
        updateUserLastSeen(profile.id);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: AuthCredentials) => {
    setLoading(true);
    try {
      const profile = await apiLogin(credentials);
      setUser(profile);
      if (profile.id) {
        updateUserLastSeen(profile.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string, accessToken?: string) => {
    setLoading(true);
    try {
      const profile = await apiLoginWithGoogle(idToken, accessToken);
      setUser(profile);
      if (profile.id) {
        updateUserLastSeen(profile.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (imageUri: string): Promise<string> => {
    if (!user?.id) throw new Error('User not logged in');
    const downloadUrl = await apiUploadProfilePicture(user.id, imageUri);
    setUser((prev) => (prev ? { ...prev, avatarUrl: downloadUrl } : null));
    return downloadUrl;
  };

  const signUp = async (input: SignUpInput) => {
    setLoading(true);
    try {
      const profile = await apiSignUp(input);
      setUser(profile);
      if (profile.id) {
        updateUserLastSeen(profile.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const refreshed = await getUserProfile(user.id);
      if (refreshed) setUser(refreshed);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signUp,
        loginWithGoogle,
        updateAvatar,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

