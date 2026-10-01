import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="scrollbar-hidden max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-[var(--surface)] p-5 shadow-2xl sm:rounded-[28px]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <button className="grid size-11 place-items-center rounded-full bg-slate-100 dark:bg-white/10" onClick={onClose} aria-label="إغلاق"><X size={20}/></button>
      </header>
      {children}
    </section>
  </div>;
}
