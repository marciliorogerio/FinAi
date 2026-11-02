import React, { useState } from 'react';
import {
  CreditCard,
  Wallet,
  Calendar,
  FileSpreadsheet,
  PlusCircle,
  Target,
  Bot,
  Search,
  ArrowRight,
  Sparkles,
  Receipt,
  PieChart,
  ShieldCheck,
  Building,
  DollarSign,
  Mic,
} from 'lucide-react';
import { AppTab } from './Header.tsx';

interface ServicesViewProps {
  onNavigateTab: (tab: AppTab) => void;
  pendingBillsCount?: number;
  accountsCount?: number;
  cardsCount?: number;
}

interface ServiceModuleItem {
  id: string;
  tab: AppTab;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  badgeBg?: string;
  color: string;
  iconBg: string;
  section: 'principais' | 'relatorios';
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  onNavigateTab,
  pendingBillsCount = 0,
  accountsCount = 0,
  cardsCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const services: ServiceModuleItem[] = [
    {
      id: 'cards',
      tab: 'cards',
      title: 'Cartões de Crédito',
      subtitle: 'Faturas, limites e vencimentos',
      icon: CreditCard,
      badge: cardsCount > 0 ? `${cardsCount} cartão(ões)` : undefined,
      badgeBg: 'bg-purple-100 text-purple-800',
      color: 'text-purple-600',
      iconBg: 'bg-purple-50 border-purple-100',
      section: 'principais',
    },
    {
      id: 'accounts',
      tab: 'accounts',
      title: 'Contas & Carteiras',
      subtitle: 'Saldos bancários e patrimônio',
      icon: Wallet,
      badge: accountsCount > 0 ? `${accountsCount} conta(s)` : undefined,
      badgeBg: 'bg-blue-100 text-blue-800',
      color: 'text-blue-600',
      iconBg: 'bg-blue-50 border-blue-100',
      section: 'principais',
    },
    {
      id: 'bills',
      tab: 'bills',
      title: 'Contas a Pagar',
      subtitle: 'Agendamentos e boletos a vencer',
      icon: Calendar,
      badge: pendingBillsCount > 0 ? `${pendingBillsCount} pendente(s)` : undefined,
      badgeBg: 'bg-amber-100 text-amber-900 font-bold',
      color: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
      section: 'principais',
    },
    {
      id: 'statement',
      tab: 'statement',
      title: 'Saldo e Extrato',
      subtitle: 'Histórico detalhado de transações',
      icon: FileSpreadsheet,
      color: 'text-teal-600',
      iconBg: 'bg-teal-50 border-teal-100',
      section: 'principais',
    },
    {
      id: 'input',
      tab: 'input',
      title: 'Novo Lançamento',
      subtitle: 'Lançar por IA, manual ou extrato',
      icon: PlusCircle,
      badge: 'IA Ativa',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
      section: 'principais',
    },
    {
      id: 'planning',
      tab: 'planning',
      title: 'Metas & Limites',
      subtitle: 'Orçamentos por categoria',
      icon: Target,
      color: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border-indigo-100',
      section: 'relatorios',
    },
    {
      id: 'chat',
      tab: 'chat',
      title: 'Consultor FinAI',
      subtitle: 'Assistente inteligente de finanças',
      icon: Bot,
      badge: 'IA',
      badgeBg: 'bg-emerald-100 text-emerald-800 font-black',
      color: 'text-teal-600',
      iconBg: 'bg-teal-50 border-teal-100',
      section: 'relatorios',
    },
  ];

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-24 sm:pb-16 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-neutral-800 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Serviços & Módulos</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Todos os Serviços
        </h2>
        <p className="text-neutral-300 text-xs sm:text-sm mt-1 max-w-md">
          Acesse diretamente qualquer módulo do seu gerenciador financeiro com clareza e organização.
        </p>

        {/* Search Input Bar (Matching user reference screenshot) */}
        <div className="mt-5 relative max-w-xl">
          <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
            <input
              type="text"
              placeholder="Buscar serviço ou módulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3.5 text-xs sm:text-sm text-neutral-900 font-semibold focus:outline-none placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                Limpar
              </button>
            )}
            <div className="px-4 py-3.5 bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid (Inspired by banking app reference screenshot) */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-neutral-800 uppercase tracking-wider mb-3 px-1">
            Módulos & Gestão
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredServices.map((service) => {
              const IconComponent = service.icon;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onNavigateTab(service.tab)}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col items-center text-center justify-between group cursor-pointer active:scale-95 touch-manipulation min-h-[140px]"
                >
                  {/* Top Badge */}
                  <div className="w-full flex items-center justify-end h-4">
                    {service.badge && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border border-black/5 ${service.badgeBg || 'bg-neutral-100 text-neutral-700'}`}>
                        {service.badge}
                      </span>
                    )}
                  </div>

                  {/* Rounded Square Tile Icon (Matching reference image) */}
                  <div className={`w-14 h-14 rounded-2xl ${service.iconBg} border flex items-center justify-center ${service.color} shadow-2xs group-hover:scale-105 transition-transform my-1`}>
                    <IconComponent className="w-7 h-7 stroke-[2]" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-0.5 mt-2">
                    <span className="font-extrabold text-xs sm:text-sm text-neutral-900 group-hover:text-emerald-700 transition-colors block leading-tight">
                      {service.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium block line-clamp-1">
                      {service.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
