import { getSupabaseClient } from './supabase.ts';
import { User, Session } from '@supabase/supabase-js';

export interface AuthUserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Sign in using Google OAuth via Supabase
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    // Verify provider availability to prevent navigating to a raw 400 error page if not configured in Supabase
    try {
      const check = await fetch(data.url, { method: 'GET' });
      if (!check.ok) {
        const body = await check.json().catch(() => ({}));
        if (body?.msg?.includes('provider is not enabled') || body?.error_code === 'validation_failed') {
          throw new Error(
            'O provedor Google ainda não foi ativado no painel do Supabase (Authentication > Providers > Google). Entre com seu Email e Senha abaixo.'
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('painel do Supabase')) {
        throw err;
      }
      // If CORS or redirect prevented reading, proceed with normal browser navigation
    }

    window.location.href = data.url;
  }
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

/**
 * Sign up with email and password, saving full name to user metadata and setting redirect URL
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: User | null; session: Session | null }> {
  const supabase = getSupabaseClient();
  const displayName = fullName?.trim() || email.split('@')[0];

  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: displayName,
        name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }

  return { user: data.user, session: data.session };
}

/**
 * Automatically catches and processes tokens from email confirmation links
 * Handles both #access_token and URL-encoded %23access_token fragments.
 */
export async function handleEmailConfirmationUrl(): Promise<AuthUserProfile | null> {
  if (typeof window === 'undefined') return null;

  try {
    const href = window.location.href;
    if (href.includes('access_token=') && (href.includes('#') || href.includes('%23'))) {
      let tokenString = '';
      if (href.includes('%23access_token=')) {
        tokenString = href.split('%23')[1] || '';
      } else if (window.location.hash) {
        tokenString = window.location.hash.substring(1);
      }

      if (tokenString) {
        const params = new URLSearchParams(tokenString);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.user) {
            // Clean up the URL in address bar to a clean root
            window.history.replaceState({}, document.title, window.location.pathname.replace(/\/+%23.*$/, '') || '/');
            const u = data.user;
            return {
              id: u.id,
              email: u.email || null,
              name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
              avatarUrl: u.user_metadata?.avatar_url || null,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error handling confirmation URL tokens:', err);
  }

  return null;
}

/**
 * Sign out
 */
export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Get current session and user
 */
export async function getCurrentSupabaseUser(): Promise<AuthUserProfile | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || null,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };
  } catch (err) {
    console.warn('Error getting current user:', err);
    return null;
  }
}

/**
 * Subscribe to Supabase auth state changes
 */
export function subscribeToSupabaseAuth(callback: (profile: AuthUserProfile | null) => void) {
  const supabase = getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      callback({
        id: u.id,
        email: u.email || null,
        name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
        avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      });
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}
