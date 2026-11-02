import React, { useState } from 'react';
import {
  AuthUserProfile,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
} from '../services/supabaseAuth.ts';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUserProfile) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google login notice:', err?.message || err);
      const msg = err?.message || 'Falha ao autenticar com o Google.';
      if (
        msg.includes('provider is not enabled') ||
        msg.includes('Unsupported provider') ||
        msg.includes('painel do Supabase')
      ) {
        setErrorMessage(
          'O Google OAuth precisa estar ativado no painel do Supabase. Você pode entrar ou cadastrar com Email e Senha!'
        );
      } else {
        setErrorMessage(msg);
      }
      setIsLoadingGoogle(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setErrorMessage(null);
    try {
      await resetPasswordForEmail(forgotEmail.trim());
      setForgotSent(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailAuth = async (e?: React.FormEvent, forceRegister = false) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    const isRegistering = forceRegister || tab === 'register';

    if (isRegistering) {
      if (!fullName.trim()) {
        setErrorMessage('Por favor, informe seu nome.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
        return;
      }
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoadingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!isRegistering) {
        // Sign in existing user
        const user = await signInWithEmail(email.trim(), password);
        onLoginSuccess({
          id: user.id,
          email: user.email || email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url || null,
        });
      } else {
        // Create new real account
        const displayName = fullName.trim() || email.split('@')[0];
        const { user, session } = await signUpWithEmail(email.trim(), password, displayName);

        if (session && user) {
          onLoginSuccess({
            id: user.id,
            email: user.email || email,
            name: displayName,
            avatarUrl: null,
          });
          return;
        }

        if (user) {
          setSuccessMessage(
            `Conta criada com sucesso para ${email}! Verifique seu e-mail para confirmar a conta se a verificação estiver ativada.`
          );
          setTab('login');
        }
      }
    } catch (err: any) {
      console.warn('Email auth notice:', err?.message || err);
      const msg = err?.message || 'Erro na autenticação.';
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage(
          'E-mail ou senha incorretos. Se ainda não possui cadastro, clique em "Cadastre-se".'
        );
      } else if (msg.includes('User already registered')) {
        setErrorMessage('Este e-mail já possui cadastro. Alterne para a opção "Fazer login".');
        setTab('login');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMessage('E-mail cadastrado, mas ainda não confirmado. Verifique sua caixa de entrada.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoadingEmail(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a1210] text-slate-100 flex flex-col justify-between items-center px-4 py-6 sm:py-10 selection:bg-emerald-500 selection:text-white font-sans overflow-y-auto">
      {/* FinAI Ambient Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#091e17]/90 via-[#0a1612]/95 to-[#060b09] backdrop-blur-md" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top FinAI Brand Header */}
      <header className="relative z-10 w-full max-w-[420px] text-center space-y-2.5 pt-2 pb-4">
        <div className="flex items-center justify-between px-1">
          {/* FinAI Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
              F
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              FinAI
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Pro
              </span>
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inteligência Financeira</span>
          </div>
        </div>

        {/* FinAI Tagline */}
        <p className="text-sm sm:text-base text-neutral-300 font-medium text-left px-1 pt-1 leading-snug">
          Assuma o controle total do seu dinheiro com clareza.
        </p>
      </header>

      {/* Main Card Container */}
      <main className="relative z-10 w-full max-w-[420px] my-auto">
        <div className="bg-white rounded-[32px] sm:rounded-[36px] p-6 sm:p-8 shadow-2xl border border-neutral-100 transition-all duration-300 text-slate-800">
          
          {/* Notifications / Errors */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Tab 1: ENTRAR (Login) */}
          {tab === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Entrar
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Use seu e-mail ou continue com o Google.
                </p>
              </div>

              <form onSubmit={(e) => handleEmailAuth(e, false)} className="space-y-4">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
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

                  <div className="text-right mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setIsForgotModalOpen(true);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingEmail}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-900/20 text-sm sm:text-base transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoadingEmail ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>

              {/* Bottom switch to register */}
              <div className="text-center mt-5 text-xs sm:text-sm text-slate-500 font-medium">
                Não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-emerald-600 font-semibold hover:underline cursor-pointer ml-1"
                >
                  Cadastre-se
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs text-slate-400 font-normal absolute">
                  ou
                </span>
              </div>

              {/* Google Social Login Button (Apple removed per request) */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoadingGoogle}
                  className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] shadow-2xs disabled:opacity-60 min-h-[48px] text-slate-800 text-sm font-semibold"
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
            </div>
          )}

          {/* Tab 2: CRIAR CONTA (Register) */}
          {tab === 'register' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Criar conta
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed font-normal">
                  Informe nome, e-mail e senha para começar.
                </p>
              </div>

              <form onSubmit={(e) => handleEmailAuth(e, true)} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome"
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-2xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
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
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar senha"
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

                <button
                  type="submit"
                  disabled={isLoadingEmail}
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-900/20 text-sm sm:text-base transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoadingEmail ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Cadastrar</span>
                  )}
                </button>
              </form>

              {/* Bottom switch to login */}
              <div className="text-center mt-5 text-xs sm:text-sm text-slate-500 font-medium">
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-emerald-600 font-semibold hover:underline cursor-pointer ml-1"
                >
                  Fazer login
                </button>
              </div>
            </div>
          )}

          {/* Terms and Privacy Footer inside card */}
          <div className="text-center text-[11px] sm:text-xs text-slate-500 mt-6 leading-relaxed font-normal">
            Ao continuar, você concorda com os{' '}
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="text-emerald-600 font-medium hover:underline cursor-pointer inline"
            >
              Termos de Uso
            </button>{' '}
            e a{' '}
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-emerald-600 font-medium hover:underline cursor-pointer inline"
            >
              Política de Privacidade
            </button>
            .
          </div>

        </div>
      </main>

      {/* Footer outside card */}
      <footer className="relative z-10 w-full text-center text-xs text-neutral-400 font-medium tracking-wide py-4">
        FinAI &bull; Todos os dados sincronizados com segurança na nuvem.
      </footer>

      {/* Forgotten Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative text-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotSent(false);
              }}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2">Recuperar Senha</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Informe seu e-mail abaixo para enviarmos um link de redefinição de senha.
            </p>

            {forgotSent ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Link enviado!
                </div>
                <p>Verifique sua caixa de entrada (e spam) para redefinir sua senha do FinAI.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Seu e-mail cadastrado"
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 rounded-2xl px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Enviar E-mail de Recuperação</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Terms of Use Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative max-h-[85vh] flex flex-col text-slate-800">
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Termos de Uso - FinAI
            </h3>
            
            <div className="overflow-y-auto text-xs text-slate-600 space-y-3 pr-2 leading-relaxed">
              <p>
                Bem-vindo ao <strong>FinAI</strong>. Ao utilizar nosso aplicativo de gestão financeira inteligente, você concorda com os termos aqui descritos.
              </p>
              <h4 className="font-bold text-slate-800">1. Privacidade e Dados</h4>
              <p>
                Seus dados financeiros são de uso exclusivo para o seu acompanhamento orçamentário. O FinAI não vende nem compartilha suas informações pessoais com terceiros.
              </p>
              <h4 className="font-bold text-slate-800">2. Segurança das Informações</h4>
              <p>
                Utilizamos sincronização segura em nuvem. Recomendamos o uso de senhas fortes e a não divulgação de suas credenciais de acesso.
              </p>
              <h4 className="font-bold text-slate-800">3. Responsabilidade</h4>
              <p>
                O aplicativo busca auxiliar no controle financeiro pessoal. As decisões de investimento e gastos cabem exclusivamente ao usuário.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative max-h-[85vh] flex flex-col text-slate-800">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Política de Privacidade - FinAI
            </h3>

            <div className="overflow-y-auto text-xs text-slate-600 space-y-3 pr-2 leading-relaxed">
              <p>
                A sua privacidade é nossa prioridade fundamental no <strong>FinAI</strong>.
              </p>
              <h4 className="font-bold text-slate-800">1. Coleta de Informações</h4>
              <p>
                Coletamos apenas as informações estritamente necessárias para o funcionamento do seu painel financeiro (nome, e-mail e dados das transações inseridas por você).
              </p>
              <h4 className="font-bold text-slate-800">2. Armazenamento</h4>
              <p>
                Todas as informações são armazenadas em servidores seguros com criptografia de ponta a ponta e controle de acesso estrito.
              </p>
              <h4 className="font-bold text-slate-800">3. Seus Direitos</h4>
              <p>
                Você possui total controle sobre seus dados, podendo editá-los ou excluí-los da plataforma a qualquer momento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Concordo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
