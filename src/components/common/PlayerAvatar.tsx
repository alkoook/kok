import { useEffect, useState } from 'react';

export function PlayerAvatar({ name, photo, size = 'md' }: { name: string; photo?: Blob; size?: 'sm' | 'md' | 'lg' }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!photo) { setUrl(undefined); return; } const next = URL.createObjectURL(photo); setUrl(next); return () => URL.revokeObjectURL(next); }, [photo]);
  const classes = size === 'lg' ? 'size-20 text-2xl' : size === 'sm' ? 'size-9 text-xs' : 'size-12 text-base';
  return <span className={`${classes} grid shrink-0 place-items-center overflow-hidden rounded-full bg-mint-500/15 font-black text-mint-700 dark:text-mint-300`}>{url ? <img src={url} alt="" className="size-full object-cover"/> : name.trim().slice(0, 1).toUpperCase()}</span>;
}
