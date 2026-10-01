import { Minus, Plus } from 'lucide-react';

export function Stepper({ label, value, min = 0, max, onChange, compact = false }: { label: string; value: number; min?: number; max: number; onChange: (value: number) => void; compact?: boolean }) {
  return <div className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 ${compact ? 'min-h-12 gap-1 p-1' : 'min-h-16 gap-3 p-2'}`}>
    <span className="min-w-0 flex-1 truncate px-2 font-bold">{label}</span>
    <div className="flex items-center gap-1" dir="ltr">
      <button className={`grid place-items-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-30 dark:bg-white/10 dark:text-white ${compact ? 'size-9' : 'size-11'}`} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`إنقاص ${label}`}><Minus size={19}/></button>
      <strong className={`${compact ? 'w-8 text-lg' : 'w-10 text-xl'} text-center tabular-nums`}>{value}</strong>
      <button className={`grid place-items-center rounded-xl bg-white text-mint-600 shadow-sm disabled:opacity-30 dark:bg-white/10 dark:text-mint-400 ${compact ? 'size-9' : 'size-11'}`} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`زيادة ${label}`}><Plus size={19}/></button>
    </div>
  </div>;
}
