import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { db } from '../db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage on mount
    const savedUser = localStorage.getItem('eventflow_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Basic check to see if user still exists in DB (optional but safer)
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('eventflow_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    // Remove password before storing in state/localStorage
    const { password, ...safeUser } = userData;
    setUser(safeUser as User);
    localStorage.setItem('eventflow_user', JSON.stringify(safeUser));
    
    // Update last login in DB
    if (userData.id) {
      db.users.update(userData.id, { lastLogin: Date.now() });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eventflow_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
