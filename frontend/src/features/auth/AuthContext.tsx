import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { setAuthToken } from '../../api/client';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsDemo: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  supabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Supabase initialization error:', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('travel_auth_token') || 'demo-token');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If Supabase is active, check active session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const u = session.user;
          setUser({
            id: u.id,
            email: u.email || '',
            displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Traveler',
          });
          setToken(session.access_token);
          setAuthToken(session.access_token);
        } else {
          // Fallback to demo user for frictionless local preview
          initDemoUser();
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const u = session.user;
          setUser({
            id: u.id,
            email: u.email || '',
            displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Traveler',
          });
          setToken(session.access_token);
          setAuthToken(session.access_token);
        } else {
          setUser(null);
          setToken(null);
          setAuthToken(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Supabase not configured: default to demo traveler
      initDemoUser();
      setIsLoading(false);
    }
  }, []);

  const initDemoUser = () => {
    const demoToken = 'demo-token';
    setUser({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'traveler@example.com',
      displayName: 'Explorer Alex',
    });
    setToken(demoToken);
    setAuthToken(demoToken);
  };

  const loginAsDemo = () => {
    initDemoUser();
  };

  const login = async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        setToken(data.session.access_token);
        setAuthToken(data.session.access_token);
      }
    } else {
      // Local demo mode: accept login
      setUser({
        id: '00000000-0000-0000-0000-000000000001',
        email,
        displayName: email.split('@')[0],
      });
      setToken('demo-token');
      setAuthToken('demo-token');
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      if (data.session) {
        setToken(data.session.access_token);
        setAuthToken(data.session.access_token);
      }
    } else {
      setUser({
        id: '00000000-0000-0000-0000-000000000001',
        email,
        displayName: name || email.split('@')[0],
      });
      setToken('demo-token');
      setAuthToken('demo-token');
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setToken(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        loginAsDemo,
        login,
        signup,
        logout,
        supabaseConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
