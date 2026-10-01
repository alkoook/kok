import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ToastContext } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage((current) => current === next ? '' : current), 2600);
  }, []);
  const value = useMemo(() => show, [show]);
  return <ToastContext.Provider value={value}>{children}{message && <div className="toast-in fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-slate-900" role="status">{message}</div>}</ToastContext.Provider>;
}
