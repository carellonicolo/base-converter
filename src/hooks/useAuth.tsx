import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiProfile, redirectToLogin, redirectToLogout, type UserProfile } from '../lib/auth';

interface AuthContextValue {
  /** true finché non sappiamo se c'è una sessione. */
  loading: boolean;
  /** Profilo se loggato, altrimenti null (modalità libera). */
  user: UserProfile | null;
  /** true se docente (isTeacher o isSuperAdmin). */
  isTeacher: boolean;
  /** true se studente con almeno una classe approvata. */
  isApprovedStudent: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const res = await apiProfile();
    if (!mounted.current) return;
    if (res.ok && res.data) {
      setUser(res.data.user);
    } else if (res.status === 401) {
      setUser(null);
    }
    // Altri errori (rete/500): manteniamo lo stato precedente.
  }, []);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      await refresh();
      if (mounted.current) setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const login = useCallback(() => redirectToLogin(), []);
  const logout = useCallback(() => redirectToLogout(), []);

  const isTeacher = !!(user?.isTeacher || user?.isSuperAdmin);
  const isApprovedStudent = !!user && !isTeacher && user.status === 'active' && user.classes.length > 0;

  const value = useMemo<AuthContextValue>(
    () => ({ loading, user, isTeacher, isApprovedStudent, login, logout, refresh }),
    [loading, user, isTeacher, isApprovedStudent, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>.');
  return ctx;
}
