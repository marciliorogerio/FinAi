import React, { useState } from 'react';
import {
  Home,
  FileSpreadsheet,
  PlusCircle,
  CreditCard,
  Target,
  Grid,
  Bot,
  Calendar,
  X,
  Sparkles,
  ChevronUp,
} from 'lucide-react';
import { AppTab } from './Header.tsx';

interface BottomTabBarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = React.memo(({
  activeTab,
  setActiveTab,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Expandable "Mais Módulos" Overlay Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden">
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-neutral-200 space-y-4 max-w-lg mx-auto w-full animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-900">
                    Todos os Módulos FinAI
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Acesse qualquer área do sistema rapidamente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'home'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <Home className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold text-xs block">Início</span>
                  <span className="text-[10px] text-neutral-500">Visão Geral & Saldos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('statement')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'statement'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="font-bold text-xs block">Extrato</span>
                  <span className="text-[10px] text-neutral-500">Histórico de Lançamentos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('input')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'input'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold text-xs block">Novo Lançamento</span>
                  <span className="text-[10px] text-neutral-500">Voz, Manual ou Extrato</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('accounts')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'accounts'
                    ? 'border-purple-600 bg-purple-50/80 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-purple-600" />
                <div>
                  <span className="font-bold text-xs block">Contas & Cartões</span>
                  <span className="text-[10px] text-neutral-500">Saldos & Faturas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('planning')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'planning'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <Target className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="font-bold text-xs block">Metas & Limites</span>
                  <span className="text-[10px] text-neutral-500">Planejamento do Mês</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('chat')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  activeTab === 'chat'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <Bot className="w-5 h-5 text-teal-600" />
                <div>
                  <span className="font-bold text-xs block flex items-center gap-1">
                    <span>Chat FinAI</span>
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  </span>
                  <span className="text-[10px] text-neutral-500">Consultor Financeiro IA</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar Navigation */}
      <nav
        aria-label="Navegação Principal Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 pb-safe lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none transform-gpu translate-z-0 translate-y-0"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {/* 1. Início */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setActiveTab('home');
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative cursor-pointer touch-manipulation ${
              activeTab === 'home'
                ? 'text-emerald-700 font-bold'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Início</span>
            {activeTab === 'home' && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </button>

          {/* 2. Extrato */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setActiveTab('statement');
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative cursor-pointer touch-manipulation ${
              activeTab === 'statement'
                ? 'text-emerald-700 font-bold'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'statement' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Extrato</span>
            {activeTab === 'statement' && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </button>

          {/* 3. Lançar (Prominent Center Button) */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setActiveTab('input');
            }}
            className="flex flex-col items-center justify-center min-h-[48px] py-1 transition-transform active:scale-95 cursor-pointer relative touch-manipulation"
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-all -mt-3.5 ${
                activeTab === 'input'
                  ? 'bg-emerald-700 text-white shadow-emerald-700/30 ring-4 ring-white'
                  : 'bg-emerald-600 text-white shadow-emerald-600/20'
              }`}
            >
              <PlusCircle className="w-6 h-6 stroke-[2.3]" />
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight ${
                activeTab === 'input'
                  ? 'text-emerald-700 font-bold'
                  : 'text-neutral-600 font-medium'
              }`}
            >
              Lançar
            </span>
          </button>

          {/* 4. Contas a Pagar */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setActiveTab('bills');
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative cursor-pointer touch-manipulation ${
              activeTab === 'bills'
                ? 'text-emerald-700 font-bold'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'bills' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 tracking-tight">A Pagar</span>
            {activeTab === 'bills' && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </button>

          {/* 5. Serviços (Tela em Grade conforme referência) */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setActiveTab('services');
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors relative cursor-pointer touch-manipulation ${
              activeTab === 'services' || isMenuOpen
                ? 'text-emerald-700 font-bold'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Grid className={`w-5 h-5 ${activeTab === 'services' || isMenuOpen ? 'stroke-[2.5] text-emerald-600' : 'stroke-2'}`} />
            <span className="text-[10px] mt-1 tracking-tight">Serviços</span>
            {(activeTab === 'services' || isMenuOpen) && (
              <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
});
