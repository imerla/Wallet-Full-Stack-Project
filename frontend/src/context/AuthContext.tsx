import { createContext, useContext, useState, useEffect } from 'react';
import type { LoginResponse } from '../types/auth';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  userId: string | null;
  username: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN' | null;
  walletId: string | null;
  login: (userData: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'access_token';

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true; // Invalid token, treat as expired
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<'USER' | 'ADMIN' | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('user_data');
        setIsInitialized(true);
        return;
      }

      setToken(storedToken);
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        setUserId(payload.userId || null);
        setRole(payload.role || 'USER');
      } catch (err) {
        console.error('Failed to parse token:', err);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('user_data');
      }
    }
    
    setIsInitialized(true);
  }, []);

  const login = (userData: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, userData.token);
    localStorage.setItem('user_data', JSON.stringify({
      username: userData.username,
      email: userData.email,
      walletId: userData.walletId,
    }));
    
    setToken(userData.token);
    setUserId(userData.id);
    setUsername(userData.username);
    setEmail(userData.email);
    setRole(userData.role);
    setWalletId(userData.walletId);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user_data');
    setToken(null);
    setUserId(null);
    setUsername(null);
    setEmail(null);
    setRole(null);
    setWalletId(null);
  };

  const value = {
    token,
    isAuthenticated: !!token,
    isInitialized,
    userId,
    username,
    email,
    role,
    walletId,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
