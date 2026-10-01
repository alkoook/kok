import { X } from 'lucide-react';
import { useEffect } from 'react';

export function ContextMessageOverlay({ message, durationMs, onDismiss }: { message: string; durationMs: number; onDismiss: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDismiss, durationMs); return () => window.clearTimeout(timer); }, [durationMs, onDismiss]);
  return <aside className="context-message fixed inset-x-3 bottom-24 z-[65] mx-auto max-w-xl rounded-[28px] border border-amber-400/40 bg-slate-950 p-5 text-white shadow-2xl" role="status"><button className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-white/10" onClick={onDismiss}><X/></button><span className="eyebrow">رسالة القعدة</span><p className="mt-2 pe-8 text-xl font-black leading-9">{message}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"><span className="message-progress block h-full bg-amber-400" style={{ animationDuration: `${durationMs}ms` }}/></div></aside>;
}
