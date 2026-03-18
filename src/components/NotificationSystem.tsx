import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, X, CreditCard, Tag, Info } from 'lucide-react';
import { InAppNotif, NotifType } from '../utils/notifications';

// ─── Individual Toast ─────────────────────────────────────────────────────────

const ICONS: Record<NotifType, React.ReactNode> = {
  payment: <CreditCard size={16} />,
  promo: <Tag size={16} />,
  info: <Info size={16} />,
};

const ACCENT: Record<NotifType, string> = {
  payment: '#3b82f6',
  promo: '#f59e0b',
  info: '#8b5cf6',
};

const Toast: React.FC<{ notif: InAppNotif; onDismiss: (id: string) => void }> = ({ notif, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notif.id), 7000);
    return () => clearTimeout(t);
  }, [notif.id, onDismiss]);

  const accent = notif.color || ACCENT[notif.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="flex items-start gap-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-xl shadow-zinc-200/60 w-80 cursor-pointer group"
      onClick={() => onDismiss(notif.id)}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: accent }}
      >
        {ICONS[notif.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900 leading-snug">{notif.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{notif.body}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 rounded-lg transition-all text-zinc-400"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────

export const ToastContainer: React.FC<{
  notifs: InAppNotif[];
  onDismiss: (id: string) => void;
}> = ({ notifs, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 items-end pointer-events-none">
    <AnimatePresence mode="popLayout">
      {notifs.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notif={n} onDismiss={onDismiss} />
        </div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── Notification Bell (sidebar / header) ────────────────────────────────────

export const NotificationBell: React.FC<{
  notifs: InAppNotif[];
  onClear: () => void;
}> = ({ notifs, onClear }) => {
  const [open, setOpen] = useState(false);
  const count = notifs.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 hover:bg-zinc-100 rounded-xl transition-colors"
      >
        <Bell size={18} className="text-zinc-500" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-80 bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-zinc-200/60 overflow-hidden z-[300]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-zinc-400" />
                <span className="text-sm font-bold text-zinc-900">Notifications</span>
                {count > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100">{count}</span>}
              </div>
              {count > 0 && (
                <button onClick={() => { onClear(); setOpen(false); }} className="text-[10px] font-bold text-zinc-400 hover:text-zinc-700 transition-colors uppercase tracking-wider">
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {count === 0 ? (
                <div className="flex flex-col items-center py-10 text-zinc-300 gap-2">
                  <Bell size={32} className="opacity-30" />
                  <p className="text-xs font-medium text-zinc-400">No notifications</p>
                </div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: n.color || ACCENT[n.type] }}
                    >
                      {React.cloneElement(ICONS[n.type] as React.ReactElement, { size: 13 })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900">{n.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{n.body}</p>
                    </div>
                    <button onClick={() => onClear()} className="p-1 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-600 transition-all">
                      <X size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Hook to manage the notif queue ──────────────────────────────────────────

export function useInAppNotifications() {
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);

  const addNotif = useCallback((n: InAppNotif) => {
    setNotifs(prev => {
      if (prev.find(x => x.id === n.id)) return prev;
      return [...prev, n];
    });
  }, []);

  const dismissNotif = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifs([]), []);

  return { notifs, addNotif, dismissNotif, clearAll };
}
