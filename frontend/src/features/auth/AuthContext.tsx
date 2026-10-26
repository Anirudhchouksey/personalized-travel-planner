import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { setAuthToken, api } from '../../api/client';

export interface User {
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
  signup: (email: string, password: string, name?: string) => Promise<{ requiresVerification?: boolean }>;
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
    supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (err) {
    console.error('Supabase initialization error:', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const mode = localStorage.getItem('travel_auth_mode');
      if (mode) {
        const saved = localStorage.getItem('travel_auth_user');
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // Storage unavailable
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const mode = localStorage.getItem('travel_auth_mode');
      if (mode) {
        return localStorage.getItem('travel_auth_token');
      }
    } catch {
      // Storage unavailable
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    try {
      localStorage.removeItem('travel_auth_mode');
      localStorage.removeItem('travel_auth_user');
      localStorage.removeItem('travel_auth_token');
    } catch {
      // Storage unavailable
    }
  };

  useEffect(() => {
    const mode = localStorage.getItem('travel_auth_mode');

    // Clean up any stale legacy demo-token stored before this upgrade
    if (!mode) {
      clearAuthState();
    } else {
      const currentTok = localStorage.getItem('travel_auth_token');
      if (currentTok) setAuthToken(currentTok);
    }

    if (supabase) {
      // Check active Supabase session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }
        if (session) {
          const u = session.user;
          const currentUser: User = {
            id: u.id,
            email: u.email || '',
            displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Traveler',
          };
          setUser(currentUser);
          setToken(session.access_token);
          setAuthToken(session.access_token);
          try {
            localStorage.setItem('travel_auth_mode', 'auth');
            localStorage.setItem('travel_auth_user', JSON.stringify(currentUser));
            localStorage.setItem('travel_auth_token', session.access_token);
          } catch {}
        } else {
          // If no active Supabase session, check if explicit demo mode was selected
          if (mode === 'demo') {
            const savedUser = localStorage.getItem('travel_auth_user');
            if (savedUser) {
              try {
                setUser(JSON.parse(savedUser));
                setToken('demo-token');
                setAuthToken('demo-token');
              } catch {
                clearAuthState();
              }
            } else {
              clearAuthState();
            }
          } else {
            clearAuthState();
          }
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          const u = session.user;
          const currentUser: User = {
            id: u.id,
            email: u.email || '',
            displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Traveler',
          };
          setUser(currentUser);
          setToken(session.access_token);
          setAuthToken(session.access_token);
          try {
            localStorage.setItem('travel_auth_mode', 'auth');
            localStorage.setItem('travel_auth_user', JSON.stringify(currentUser));
            localStorage.setItem('travel_auth_token', session.access_token);
          } catch {}
        } else if (event === 'SIGNED_OUT') {
          clearAuthState();
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Supabase is not configured: only keep session if explicitly signed in
      if (mode) {
        const savedUser = localStorage.getItem('travel_auth_user');
        const savedToken = localStorage.getItem('travel_auth_token');
        if (savedUser && savedToken) {
          try {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
            setAuthToken(savedToken);
          } catch {
            clearAuthState();
          }
        } else {
          clearAuthState();
        }
      } else {
        clearAuthState();
      }
      setIsLoading(false);
    }
  }, []);

  const loginAsDemo = () => {
    const demoUser: User = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'traveler@example.com',
      displayName: 'Explorer Alex',
    };
    const demoToken = 'demo-token';
    setUser(demoUser);
    setToken(demoToken);
    setAuthToken(demoToken);
    try {
      localStorage.setItem('travel_auth_mode', 'demo');
      localStorage.setItem('travel_auth_user', JSON.stringify(demoUser));
      localStorage.setItem('travel_auth_token', demoToken);
    } catch {}
  };

  const login = async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        const u = data.session.user;
        const loggedUser: User = {
          id: u.id,
          email: u.email || email,
          displayName: u.user_metadata?.full_name || email.split('@')[0] || 'Traveler',
        };
        setUser(loggedUser);
        setToken(data.session.access_token);
        setAuthToken(data.session.access_token);
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(loggedUser));
          localStorage.setItem('travel_auth_token', data.session.access_token);
        } catch {}
      }
    } else {
      try {
        const res = await api.login({ email, password });
        const loggedUser: User = {
          id: res.user?.id || '00000000-0000-0000-0000-000000000001',
          email: res.user?.email || email,
          displayName: res.user?.display_name || email.split('@')[0],
        };
        setUser(loggedUser);
        setToken(res.access_token);
        setAuthToken(res.access_token);
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(loggedUser));
          localStorage.setItem('travel_auth_token', res.access_token);
        } catch {}
      } catch (backendErr: any) {
        if (backendErr.message && !backendErr.message.includes('Unable to connect')) {
          throw backendErr;
        }
        const localUser: User = {
          id: '00000000-0000-0000-0000-000000000001',
          email,
          displayName: email.split('@')[0],
        };
        setUser(localUser);
        setToken('demo-token');
        setAuthToken('demo-token');
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(localUser));
          localStorage.setItem('travel_auth_token', 'demo-token');
        } catch {}
      }
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
        const u = data.session.user;
        const loggedUser: User = {
          id: u.id,
          email: u.email || email,
          displayName: name || u.user_metadata?.full_name || email.split('@')[0] || 'Traveler',
        };
        setUser(loggedUser);
        setToken(data.session.access_token);
        setAuthToken(data.session.access_token);
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(loggedUser));
          localStorage.setItem('travel_auth_token', data.session.access_token);
        } catch {}
        return { requiresVerification: false };
      } else if (data.user) {
        return { requiresVerification: true };
      }
      return { requiresVerification: false };
    } else {
      try {
        const res = await api.register({ email, password, display_name: name });
        const loggedUser: User = {
          id: res.user?.id || '00000000-0000-0000-0000-000000000001',
          email: res.user?.email || email,
          displayName: res.user?.display_name || name || email.split('@')[0],
        };
        setUser(loggedUser);
        setToken(res.access_token);
        setAuthToken(res.access_token);
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(loggedUser));
          localStorage.setItem('travel_auth_token', res.access_token);
        } catch {}
        return { requiresVerification: false };
      } catch (backendErr: any) {
        if (backendErr.message && !backendErr.message.includes('Unable to connect')) {
          throw backendErr;
        }
        const localUser: User = {
          id: '00000000-0000-0000-0000-000000000001',
          email,
          displayName: name || email.split('@')[0],
        };
        setUser(localUser);
        setToken('demo-token');
        setAuthToken('demo-token');
        try {
          localStorage.setItem('travel_auth_mode', 'auth');
          localStorage.setItem('travel_auth_user', JSON.stringify(localUser));
          localStorage.setItem('travel_auth_token', 'demo-token');
        } catch {}
        return { requiresVerification: false };
      }
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    clearAuthState();
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
