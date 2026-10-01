import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { db } from '../../db/database';
import { deletePlayer, playerStats, resizePlayerPhoto, savePlayer } from '../../players/roster';
import type { PlayerProfile } from '../../types';

export function PlayersPage() {
  const players = useLiveQuery(() => db.players.orderBy('updatedAt').reverse().toArray(), [], []); const games = useLiveQuery(() => db.games.toArray(), [], []); const rounds = useLiveQuery(() => db.rounds.toArray(), [], []);
  const [editing, setEditing] = useState<PlayerProfile | null>();
  return <main className="page"><header className="mb-5 flex items-end justify-between"><div><span className="eyebrow">القائمة المحلية</span><h1 className="text-3xl font-black">اللاعبون</h1></div><Button size="sm" icon={<Plus/>} onClick={() => setEditing({ id: '', name: '', createdAt: '', updatedAt: '' })}>إضافة</Button></header><div className="space-y-3">{players.map((player) => { const stats = playerStats(player.id, games, rounds); return <article key={player.id} className="surface flex items-center gap-3 p-4"><PlayerAvatar name={player.name} photo={player.photo}/><div className="min-w-0 flex-1"><strong className="block truncate">{player.name}</strong><span className="muted text-xs">{stats.games} مباراة · {stats.wins} فوز{stats.averageLash === undefined ? '' : ` · متوسط اللطش ${Math.round(stats.averageLash)}`}</span></div><button className="grid size-11 place-items-center rounded-xl bg-slate-100 dark:bg-white/10" onClick={() => setEditing(player)} aria-label="تعديل"><Pencil size={17}/></button><button className="grid size-11 place-items-center rounded-xl text-red-500" onClick={() => confirm(`حذف ${player.name} من القائمة؟ لن تتغير المباريات القديمة.`) && deletePlayer(player.id)} aria-label="حذف"><Trash2 size={17}/></button></article>; })}{players.length === 0 && <div className="surface py-12 text-center"><p className="muted">أضف لاعبين دائمين أو استخدم أسماء مؤقتة أثناء إعداد المباراة.</p></div>}</div><Modal open={Boolean(editing)} title={editing?.id ? 'تعديل اللاعب' : 'لاعب جديد'} onClose={() => setEditing(undefined)}>{editing && <PlayerForm player={editing} onDone={() => setEditing(undefined)}/>}</Modal></main>;
}

function PlayerForm({ player, onDone }: { player: PlayerProfile; onDone: () => void }) {
  const [name, setName] = useState(player.name); const [photo, setPhoto] = useState<Blob | null | undefined>(player.photo); const [saving, setSaving] = useState(false);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setPhoto(await resizePlayerPhoto(file)); };
  return <div className="space-y-4"><div className="flex items-center gap-4"><PlayerAvatar name={name || '؟'} photo={photo ?? undefined} size="lg"/><label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-slate-100 px-4 font-bold dark:bg-white/10"><Camera size={18}/> صورة<input className="hidden" type="file" accept="image/*" onChange={choose}/></label>{photo && <button className="text-sm font-bold text-red-500" onClick={() => setPhoto(null)}>إزالة</button>}</div><label><span className="label">الاسم</span><input className="field" value={name} onChange={(event) => setName(event.target.value)} autoFocus/></label><Button className="w-full" disabled={!name.trim() || saving} onClick={async () => { setSaving(true); await savePlayer({ id: player.id || undefined, name, photo }); onDone(); }}>حفظ</Button></div>;
}
