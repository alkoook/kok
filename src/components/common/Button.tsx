import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...props }: Props) {
  const variants = {
    primary: 'bg-mint-500 text-white shadow-lg shadow-mint-500/20 hover:bg-mint-600 active:scale-[.98]',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  const sizes = { sm: 'min-h-11 px-3 text-sm rounded-xl', md: 'min-h-12 px-5 rounded-2xl', lg: 'min-h-14 px-6 text-lg rounded-2xl' };
  return <button className={`inline-flex items-center justify-center gap-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{icon}{children}</button>;
}
