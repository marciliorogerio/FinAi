import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:right-auto sm:left-4 z-50 flex items-center justify-center sm:justify-start gap-2 rounded-2xl bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-3 duration-200">
      <span className="h-2 w-2 rounded-full bg-white animate-ping shrink-0" />
      <WifiOff className="w-4 h-4 shrink-0" />
      <span className="truncate">Modo Offline — Dados guardados no aparelho.</span>
    </div>
  );
};
