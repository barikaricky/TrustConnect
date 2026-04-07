import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPinSet, clearPin } from './lockScreenService';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'customer' | 'artisan' | 'company';
  accountType?: 'individual' | 'company';
}

interface AuthContextType {
  user: User | null;
  userRole: 'customer' | 'artisan' | 'company' | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  needsPinSetup: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: 'customer' | 'artisan' | 'company') => void;
  unlock: () => void;
  completePinSetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'artisan' | 'company' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const appState = useRef(AppState.currentState);
  // Track when the app went to background to avoid locking on brief OS transitions
  // (e.g. image picker, camera, share sheet) that only last a second or two.
  const backgroundTimeRef = useRef<number | null>(null);
  const LOCK_AFTER_MS = 30_000; // only lock after 30+ seconds in background

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Listen for app going to background / becoming active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user]);

  const handleAppStateChange = async (nextState: AppStateStatus) => {
    // Record when app enters background
    if (appState.current === 'active' && nextState.match(/inactive|background/)) {
      backgroundTimeRef.current = Date.now();
    }

    // When app comes back from background to active, only lock if it was
    // backgrounded for 30+ seconds (avoids locking during image picker, etc.)
    if (
      appState.current.match(/inactive|background/) &&
      nextState === 'active' &&
      user
    ) {
      const elapsed = backgroundTimeRef.current ? Date.now() - backgroundTimeRef.current : 0;
      backgroundTimeRef.current = null;
      if (elapsed >= LOCK_AFTER_MS) {
        const pinSet = await hasPinSet();
        if (pinSet) {
          setIsLocked(true);
        }
      }
    }
    appState.current = nextState;
  };

  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('@trustconnect_token');
      const userData = await AsyncStorage.getItem('@trustconnect_user');
      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setUserRole(parsed.role || 'customer');

        // Check if user has a PIN; if so, lock the app on start
        const pinSet = await hasPinSet();
        if (pinSet) {
          setIsLocked(true);
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  };

  const login = async (userData: User, token: string) => {
    await AsyncStorage.setItem('@trustconnect_token', token);
    await AsyncStorage.setItem('@trustconnect_user', JSON.stringify(userData));
    setUser(userData);
    setUserRole(userData.role || 'customer');
    setIsLocked(false);

    // Check if PIN is set for this device  
    const pinSet = await hasPinSet();
    if (!pinSet) {
      setNeedsPinSetup(true);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@trustconnect_token');
    await AsyncStorage.removeItem('@trustconnect_user');
    await clearPin();
    setUser(null);
    setUserRole(null);
    setIsLocked(false);
    setNeedsPinSetup(false);
  };

  const switchRole = (role: 'customer' | 'artisan' | 'company') => {
    setUserRole(role);
  };

  const unlock = () => {
    setIsLocked(false);
  };

  const completePinSetup = () => {
    setNeedsPinSetup(false);
  };

  return (
    <AuthContext.Provider value={{
      user, userRole, isAuthenticated: !!user,
      isLocked, needsPinSetup,
      login, logout, switchRole, unlock, completePinSetup,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a default for screens that don't have the provider
    return {
      user: null,
      userRole: null as 'customer' | 'artisan' | 'company' | null,
      isAuthenticated: false,
      isLocked: false,
      needsPinSetup: false,
      login: async () => {},
      logout: async () => {},
      switchRole: () => {},
      unlock: () => {},
      completePinSetup: () => {},
    };
  }
  return context;
}
