import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
  AuthUserProfile,
} from '../services/supabaseAuth.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: AuthUserProfile) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingGoogle(true);
      setErrorMessage(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.message?.includes('provider is not enabled') || err.message?.includes('OAuth')) {
        setErrorMessage(
          'O provedor Google precisa estar ativado no seu projeto Supabase.'
        );
      } else {
        setErrorMessage(err.message || 'Falha ao autenticar com o Google.');
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (isForgotMode) {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        await resetPasswordForEmail(email.trim());
        setForgotSent(true);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Erro ao enviar e-mail de recuperação.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password.trim()) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      if (authMode === 'signin') {
        const user = await signInWithEmail(email.trim(), password);
        onShowToast('Login realizado com sucesso!');
        onSuccess({
          id: user.id,
          email: user.email || email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          avatarUrl: null,
        });
        onClose();
      } else {
        if (password !== confirmPassword) {
          setErrorMessage('As senhas não coincidem.');
          setIsLoading(false);
          return;
        }
        const displayName = fullName.trim() || email.split('@')[0];
        const { user } = await signUpWithEmail(email.trim(), password, displayName);
        onShowToast('Conta criada com sucesso! Verifique seu e-mail.');
        if (user) {
          onSuccess({
            id: user.id,
            email: user.email || email,
            name: displayName,
            avatarUrl: null,
          });
        }
        onClose();
      }
    } catch (err: any) {
      console.warn('Email Auth notice:', err?.message || err);
      const msg = err?.message || 'Erro ao processar autenticação.';
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[420px] rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5 text-slate-800">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-left space-y-1 pt-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20">
              F
            </div>
            <span className="font-black text-slate-900 tracking-tight text-base flex items-center gap-1.5">
              FinAI
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                Pro
              </span>
            </span>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isForgotMode
              ? 'Recuperar Senha'
              : authMode === 'signin'
              ? 'Entrar'
              : 'Criar conta'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
            {isForgotMode
              ? 'Informe seu e-mail para receber um link de redefinição.'
              : authMode === 'signin'
              ? 'Use seu e-mail ou continue com o Google.'
              : 'Informe nome, e-mail e senha para criar sua conta.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] leading-relaxed block">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Form Area */}
        {isForgotMode ? (
          <div>
            {forgotSent ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs space-y-2">
                <p className="font-bold">Link de recuperação enviado!</p>
                <p>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
                <button
                  type="button"
                  onClick={() => setIsForgotMode(false)}
                  className="mt-2 text-emerald-600 font-bold underline cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl text-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'Enviando...' : 'Enviar E-mail de Recuperação'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'signup' && (
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                />
              </div>
            )}

            <div>
              <input
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
              />
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-4 pr-12 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {authMode === 'signin' && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(true)}
                    className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </div>

            {authMode === 'signup' && (
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-4 pr-12 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-950/10 text-sm sm:text-base transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{authMode === 'signin' ? 'Entrar' : 'Cadastrar'}</span>
              )}
            </button>
          </form>
        )}

        {/* Toggle sign in / sign up */}
        {!isForgotMode && (
          <>
            <div className="text-center text-xs sm:text-sm text-slate-500 font-medium">
              {authMode === 'signin' ? (
                <span>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="font-semibold text-emerald-600 hover:underline cursor-pointer ml-1"
                  >
                    Cadastre-se
                  </button>
                </span>
              ) : (
                <span>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="font-semibold text-emerald-600 hover:underline cursor-pointer ml-1"
                  >
                    Fazer login
                  </button>
                </span>
              )}
            </div>

            {/* Divider */}
            {authMode === 'signin' && (
              <>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-xs text-slate-400 font-normal absolute">
                    ou
                  </span>
                </div>

                {/* Google Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoadingGoogle}
                    className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] shadow-2xs disabled:opacity-60 min-h-[48px] text-slate-800 text-sm font-semibold"
                    title="Entrar com Google"
                  >
                    {isLoadingGoogle ? (
                      <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                          />
                        </svg>
                        <span>Continuar com o Google</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};
