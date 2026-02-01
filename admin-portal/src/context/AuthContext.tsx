import React, { createContext, useContext, useState, useEffect } from 'react';

interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  staffId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: Admin | null;
  twoFactorToken: string | null;
  setTwoFactorToken: (token: string | null) => void;
  login: (admin: Admin, token: string, sessionToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('adminToken');
    const sessionToken = localStorage.getItem('sessionToken');
    const storedAdmin = localStorage.getItem('admin');

    if (token && sessionToken && storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
      setIsAuthenticated(true);
    }
  }, []);

  const login = (admin: Admin, token: string, sessionToken: string) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('admin', JSON.stringify(admin));
    setAdmin(admin);
    setIsAuthenticated(true);
    setTwoFactorToken(null);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('admin');
    setAdmin(null);
    setIsAuthenticated(false);
    setTwoFactorToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        admin,
        twoFactorToken,
        setTwoFactorToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
