import React from 'react';
import {
  Home,
  FileSpreadsheet,
  Calendar,
  Wallet,
  CreditCard,
  Target,
  Bot,
  Grid,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  LogIn,
  User as UserIcon,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { AuthUserProfile } from '../services/supabaseAuth.ts';

export type AppTab = 'home' | 'statement' | 'bills' | 'accounts' | 'cards' | 'planning' | 'chat' | 'input' | 'services';

interface HeaderProps {
  user?: AuthUserProfile | null;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  isSupabaseConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onLogout,
  isSupabaseConnected = true,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-neutral-900 tracking-tight">FinAI</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Inteligência Financeira
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 hidden md:block">
                Controle modular com sincronização em nuvem
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop - Independent Dedicated Modules) */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'statement'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Extrato</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bills'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Contas a Pagar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              <span>Contas & Bancos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-500" />
              <span>Cartões</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('planning')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'planning'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Metas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-emerald-500" />
              <span>Serviços</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Cloud Live Sync Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs select-none"
              title="Sincronização em nuvem ativa"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden xl:inline font-bold">Nuvem Ativa</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <PWAInstallButton />

            {/* User Profile or Demo mode badge */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2.5 pl-1 sm:pl-2.5 border-l border-neutral-200">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'Usuário'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-neutral-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden xl:block text-left text-xs min-w-0">
                  <p className="font-bold text-neutral-900 truncate max-w-[120px] leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate max-w-[120px] leading-tight">
                    {user.email}
                  </p>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sair da conta"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
