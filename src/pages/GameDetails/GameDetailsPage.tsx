import { ArrowRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { deleteGame } from '../../db/database';
import { CONTRACT_LABELS, TRIX_QUEENS } from '../../games/trix/rules';
import { aggregatePartnershipScores } from '../../games/trix/scoring';
import { useGame } from '../../hooks/useGame';
import type { GameRound, GameSession, ManualAdjustmentInput, Tarneeb41RoundInput, TarneebRoundInput, TrixContract, TrixRoundInput } from '../../types';
import { formatDate, formatDuration, GAME_LABELS, isTrix, scoreText } from '../../utils';
import { ReplayButton } from '../Game/GamePage';

export function GameDetailsPage() {
  const { gameId } = useParams(); const { game, rounds } = useGame(gameId); const navigate = useNavigate(); const [confirm, setConfirm] = useState(false);
  if (game === undefined) return <main className="page"><div className="surface h-60 animate-pulse"/></main>;
  if (!game) return <main className="page"><p>المباراة غير موجودة.</p></main>;
  const names = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? '';
  const displayedScores = isTrix(game.gameType) && game.trixMode === 'partnership' && game.teams ? aggregatePartnershipScores(game.scores, game.teams) : game.scores;
  return <main className="page pb-12"><header className="mb-6 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)] shadow-soft" onClick={() => navigate(-1)}><ArrowRight/></button><div><span className="eyebrow">تفاصيل المباراة</span><h1 className="text-2xl font-black">{GAME_LABELS[game.gameType]}</h1></div></header><section className="surface p-5"><div className="flex justify-between gap-3"><div><span className="muted text-xs">بدأت</span><strong className="block">{formatDate(game.createdAt)}</strong></div><div className="text-left"><span className="muted text-xs">المدة</span><strong className="block">{formatDuration(game.createdAt, game.finishedAt)}</strong></div></div><div className="mt-5 grid grid-cols-2 gap-2">{Object.entries(displayedScores).map(([id, score]) => <div key={id} className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><span className="muted block truncate text-xs">{names(id)}</span><b className="text-2xl">{score}</b></div>)}</div></section><section className="mt-6"><h2 className="mb-3 text-xl font-black">تسلسل الجولات</h2><div className="space-y-3">{rounds.map((round) => <article className="surface p-4" key={round.id}><span className="eyebrow">الجولة {round.index + 1}</span><h3 className="font-black">{round.type === 'tarneeb' ? `ضمان ${(round.input as TarneebRoundInput).bid}` : round.type === 'tarneeb-41' ? `ضمانات فردية — ${(round.input as Tarneeb41RoundInput).phaseAtRoundStart === 'normal' ? 'الوضع العادي' : 'مرحلة متقدمة'}` : round.type === 'manual-adjustment' ? `تصحيح — ${names((round.input as ManualAdjustmentInput).targetId)}` : CONTRACT_LABELS[round.type as TrixContract]}</h3>{trixDetails(round, game).length > 0 && <div className="muted mt-2 space-y-1 text-xs">{trixDetails(round, game).map((detail) => <p key={detail}>{detail}</p>)}</div>}<div className="mt-2 flex flex-wrap gap-2">{Object.entries(roundDelta(round, game)).map(([id, delta]) => <span key={id} className="rounded-xl bg-slate-100 px-3 py-1 text-xs dark:bg-white/5">{names(id)} <b>{scoreText(delta)}</b></span>)}</div>{round.note && <p className="muted mt-2">{round.note}</p>}</article>)}</div></section><div className="mt-6 grid gap-2"><ReplayButton game={game}/><Button variant="danger" icon={<Trash2 size={18}/>} onClick={() => setConfirm(true)}>حذف المباراة</Button><Link to="/" className="min-h-12 pt-3 text-center font-bold text-slate-500">العودة للرئيسية</Link></div><Modal open={confirm} title="حذف هذه المباراة؟" onClose={() => setConfirm(false)}><p className="muted mb-5">لن تتمكن من استعادة النتائج بعد الحذف.</p><div className="grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setConfirm(false)}>إلغاء</Button><Button variant="danger" onClick={async () => { await deleteGame(game.id); navigate('/history', { replace: true }); }}>حذف نهائيًا</Button></div></Modal></main>;
}

function roundDelta(round: GameRound, game: GameSession) { return isTrix(game.gameType) && game.trixMode === 'partnership' && game.teams ? aggregatePartnershipScores(round.scoreDelta, game.teams) : round.scoreDelta; }
function trixDetails(round: GameRound, game: GameSession) {
  if (!isTrix(game.gameType) || round.type === 'manual-adjustment') return [];
  const input = round.input as TrixRoundInput; const name = (teamId?: string, playerId?: string) => game.teams?.find((team) => team.id === teamId)?.name ?? game.players.find((player) => player.id === playerId)?.name ?? '';
  const details: string[] = []; const kingTeam = input.contract === 'king' ? input.selectedTeamId : input.contract === 'complex' ? input.kingTeamId : undefined; const kingPlayer = input.contract === 'king' ? input.selectedPlayerId : input.contract === 'complex' ? input.kingPlayerId : undefined; const kingDoubler = input.contract === 'king' ? input.doubledByPlayerId : input.contract === 'complex' ? input.kingDoubledByPlayerId : undefined;
  if (input.contract === 'king' || input.contract === 'complex') details.push(`شيخ الكبة — أكله: ${name(kingTeam, kingPlayer)}${kingDoubler ? ` · مدبل، دبّله: ${name(undefined, kingDoubler)}` : ' · غير مدبل'}`);
  const queens = input.contract === 'queens' ? input.queens : input.contract === 'complex' ? input.queens : undefined;
  if (Array.isArray(queens)) queens.forEach((queen, index) => { const label = TRIX_QUEENS.find((item) => item.id === (queen.suit ?? queen.id))?.label ?? TRIX_QUEENS[index]?.label; details.push(`${label} — أكلها: ${name(queen.takenByTeamId, queen.takenByPlayerId)}${queen.doubled ? ` · مدبلة، دبّلها: ${name(undefined, queen.doubledByPlayerId)}` : ' · غير مدبلة'}`); });
  return details;
}
