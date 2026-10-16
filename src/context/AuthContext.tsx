import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AuthCredentials, SignUpInput } from '../types/auth';
import {
  subscribeAuthState,
  login as apiLogin,
  signUp as apiSignUp,
  logout as apiLogout,
  getUserProfile,
} from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
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
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: AuthCredentials) => {
    setLoading(true);
    try {
      const profile = await apiLogin(credentials);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (input: SignUpInput) => {
    setLoading(true);
    try {
      const profile = await apiSignUp(input);
      setUser(profile);
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
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, refreshProfile }}>
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
