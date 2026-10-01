import { ArrowRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { deleteGame } from '../../db/database';
import { aggregatePartnershipScores } from '../../games/trix/scoring';
import { isFastGame, lashTotal } from '../../games/fast/scoring';
import { CONTRACT_LABELS } from '../../games/trix/rules';
import { useGame } from '../../hooks/useGame';
import type { GameRound, GameSession, LashRoundInput, ManualAdjustmentInput, Tarneeb41RoundInput, TarneebRoundInput, TrixContract, TrixRankingInput } from '../../types';
import { formatDate, formatDuration, GAME_LABELS, isTrix, scoreText } from '../../utils';
import { ReplayButton } from '../Game/GamePage';

export function GameDetailsPage() {
  const { gameId } = useParams(); const { game, rounds } = useGame(gameId); const navigate = useNavigate(); const [confirmDelete, setConfirmDelete] = useState(false);
  if (game === undefined) return <main className="page"><div className="surface h-60 animate-pulse"/></main>; if (!game) return <main className="page">المباراة غير موجودة.</main>;
  const name = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id; const partnership = game.trixMode === 'partnership' && game.teams && (isTrix(game.gameType) || game.gameType === 'cc'); const displayed = partnership && !isFastGame(game) ? aggregatePartnershipScores(game.scores, game.teams!) : game.scores;
  return <main className="page"><header className="mb-5 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => navigate(-1)}><ArrowRight/></button><div><span className="eyebrow">تفاصيل المباراة</span><h1 className="text-2xl font-black">{GAME_LABELS[game.gameType]}</h1></div></header><section className="surface p-5"><div className="flex justify-between"><span>{formatDate(game.createdAt)}</span><b>{formatDuration(game.createdAt, game.finishedAt)}</b></div><div className="mt-4 grid grid-cols-2 gap-2">{Object.entries(displayed).map(([id, score]) => <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5" key={id}><span className="muted block text-xs">{name(id)}</span><b className="text-2xl">{scoreText(score)}</b></div>)}</div></section><section className="mt-5"><h2 className="mb-3 text-xl font-black">النتائج الخام</h2><div className="space-y-3">{rounds.map((round) => <RoundCard key={round.id} round={round} game={game}/>)}</div></section><div className="mt-6 grid gap-2"><ReplayButton game={game}/><Button variant="danger" icon={<Trash2/>} onClick={() => setConfirmDelete(true)}>حذف المباراة</Button><Link className="py-3 text-center font-bold" to="/">الرئيسية</Link></div><Modal open={confirmDelete} title="حذف المباراة؟" onClose={() => setConfirmDelete(false)}><Button className="w-full" variant="danger" onClick={async () => { await deleteGame(game.id); navigate('/history', { replace: true }); }}>حذف نهائيًا</Button></Modal></main>;
}

function RoundCard({ round, game }: { round: GameRound; game: GameSession }) {
  const name = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id; let title = CONTRACT_LABELS[round.type as TrixContract] ?? round.type; let details: string[] = [];
  if (round.type === 'lash') { const input = round.input as LashRoundInput; title = `لطش · مملكة ${name(round.kingdomOwnerId ?? '')}`; const rawScores = input.kind === 'lash-partnership' ? input.scoresByTeam : input.scoresByPlayer; details = [...Object.entries(rawScores).map(([id, score]) => `${name(id)}: ${score}`), `المجموع: ${lashTotal(rawScores)}`, `الختيار: ${name(input.oldMan.eaterPlayerId)} · ${input.oldMan.doubled ? 'مدبل' : 'غير مدبل'}`]; }
  else if (round.type === 'trix-ranking') { const input = round.input as TrixRankingInput; title = `تركس · مملكة ${name(round.kingdomOwnerId ?? '')}`; details = input.finishingOrder.map((id, index) => `${index + 1}. ${name(id)} — ${[200, 150, 100, 50][index]}`); }
  else if (round.type === 'tarneeb') title = `ضمان ${(round.input as TarneebRoundInput).bid}`; else if (round.type === 'tarneeb-41') title = `ضمانات فردية · ${(round.input as Tarneeb41RoundInput).phaseAtRoundStart}`; else if (round.type === 'manual-adjustment') title = `تصحيح · ${name((round.input as ManualAdjustmentInput).targetId)}`;
  return <article className="surface p-4"><span className="eyebrow">الجولة {round.index + 1}</span><h3 className="font-black">{title}</h3>{details.map((detail) => <p className="muted text-xs" key={detail}>{detail}</p>)}<div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(round.scoreDelta).map(([id, score]) => <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-white/5" key={id}><span>{name(id)}</span> <b>{scoreText(score)}</b></div>)}</div>{round.note && <p className="muted mt-2">{round.note}</p>}</article>;
}
