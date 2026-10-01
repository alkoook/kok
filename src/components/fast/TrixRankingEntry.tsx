import { Medal, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { trixRankingDelta } from '../../games/fast/scoring';
import type { GamePlayer, TrixRankingInput } from '../../types';
import { Button } from '../common/Button';

export function TrixRankingEntry({ players, initial, onConfirm }: { players: GamePlayer[]; initial?: TrixRankingInput; onConfirm: (input: TrixRankingInput, delta: Record<string, number>) => Promise<void> }) {
  const [order, setOrder] = useState<string[]>(initial?.finishingOrder ?? []); const [saving, setSaving] = useState(false); const labels = ['الأول · 200', 'الثاني · 150', 'الثالث · 100', 'الرابع · 50'];
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-2">{players.map((player) => { const rank = order.indexOf(player.id); return <button key={player.id} disabled={rank >= 0} onClick={() => setOrder((current) => [...current, player.id])} className={`min-h-24 rounded-3xl border p-3 text-right transition ${rank === 0 ? 'trix-winner border-amber-400 bg-amber-400/15' : rank > 0 ? 'border-mint-500 bg-mint-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}>{rank >= 0 && <Medal className="mb-2 text-amber-500"/>}<strong className="block truncate">{player.name}</strong><span className="muted text-xs">{rank >= 0 ? labels[rank] : `اضغط للمركز ${order.length + 1}`}</span></button>; })}</div><Button variant="secondary" className="w-full" disabled={!order.length} icon={<RotateCcw/>} onClick={() => setOrder([])}>إعادة الترتيب</Button><Button className="w-full" size="lg" disabled={order.length !== 4 || saving} onClick={async () => { setSaving(true); try { const finishingOrder = order as [string, string, string, string]; await onConfirm({ kind: 'trix-ranking', finishingOrder }, trixRankingDelta(order, players)); } finally { setSaving(false); } }}>حفظ ترتيب التركس</Button></div>;
}
