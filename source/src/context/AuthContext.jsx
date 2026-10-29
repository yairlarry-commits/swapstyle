import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authGetSession, authOnChange, authSignIn, authSignUp, authSignOut, authUpdatePassword, fetchProfile } from '../lib/api.js';
import { AVATAR_COLORS } from '../lib/constants.js';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // opened from a "reset your password" email: ask for a new password first
  const [recovering, setRecovering] = useState(() => /type=recovery/.test(window.location.hash));

  const loadProfile = useCallback(async (id) => {
    try {
      const p = await fetchProfile(id);
      setProfile(p);
      return p;
    } catch (e) {
      console.warn('profile load error', e?.message);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let alive = true;
    let settled = false;
    // Never stay on the loading screen for more than 4 seconds
    const timer = window.setTimeout(() => {
      if (alive && !settled) { settled = true; setLoading(false); }
    }, 4000);

    authGetSession()
      .then((s) => {
        if (!alive) return;
        settled = true;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) loadProfile(s.user.id).finally(() => alive && setLoading(false));
        else setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        settled = true;
        console.warn('getSession failed', e?.message);
        setLoading(false);
      });

    const unsubscribe = authOnChange((s, event) => {
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      settled = true;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => alive && setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback((email, password) => authSignIn(email, password), []);

  const signUp = useCallback((email, password, username, city) => {
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    return authSignUp(email, password, username, city, color);
  }, []);

  const setNewPassword = useCallback(async (password) => {
    const res = await authUpdatePassword(password);
    if (!res.error) {
      setRecovering(false);
      try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch {}
    }
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile, recovering, setNewPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
