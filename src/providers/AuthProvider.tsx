import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { errorMessage } from '../lib/errors';
import type { Profile, Role } from '../types';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  profileLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: readonly Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authError(error: unknown): string {
  const raw = errorMessage(error, 'No se pudo iniciar sesión.');
  const text = raw.toLowerCase();
  if (text.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (text.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.';
  }
  if (text.includes('too many requests') || text.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (text.includes('user not found')) {
    return 'No existe una cuenta con ese correo.';
  }
  return raw;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        setProfile(null);
        setError(errorMessage(profileError, 'No se pudo cargar tu perfil.'));
        return;
      }

      if (!data) {
        setProfile(null);
        setError(
          'Tu usuario no tiene un perfil asignado. Pide a un administrador que revise tu acceso.',
        );
        return;
      }

      setProfile(data as Profile);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError(errorMessage(err, 'No se pudo cargar tu perfil.'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(
        'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      );
      return;
    }

    let active = true;

    async function init() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) throw sessionError;

        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
      } catch (err) {
        if (active) setError(errorMessage(err, 'No se pudo recuperar la sesión.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setProfileLoading(true);
        // Avoid calling Supabase inside the auth callback (it can deadlock).
        window.setTimeout(() => {
          void loadProfile(nextSession.user.id);
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase no está configurado. Completa las variables de entorno antes de iniciar sesión.',
      );
    }
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) throw new Error(authError(signInError));
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw new Error(errorMessage(signOutError, 'No se pudo cerrar sesión.'));
    setProfile(null);
    setSession(null);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    await loadProfile(userId);
  }, [loadProfile, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      profileLoading,
      session,
      user: session?.user ?? null,
      profile,
      error,
      signIn,
      signOut,
      refreshProfile,
      hasRole: (roles) => Boolean(profile && roles.includes(profile.role)),
    }),
    [
      loading,
      profileLoading,
      session,
      profile,
      error,
      signIn,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
