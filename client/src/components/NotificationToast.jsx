import React from 'react';
import { useSocket } from '../context/SocketContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast = () => {
  const { notifications, removeNotification } = useSocket();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-2 sm:right-5 z-50 flex flex-col gap-2 max-w-[92vw] sm:max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const isSuccess = n.type === 'success';
        const isError = n.type === 'error';
        const isWarning = n.type === 'warning';

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-2xl backdrop-blur-md border transition-all transform animate-slide-in ${
              isSuccess
                ? 'bg-slate-900/95 border-amber-500/50 text-slate-100'
                : isError
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                : isWarning
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
                : 'bg-slate-900/90 border-slate-700/60 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {isWarning && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <span className="text-sm font-medium leading-snug">{n.message}</span>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="ml-2 text-white/50 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

