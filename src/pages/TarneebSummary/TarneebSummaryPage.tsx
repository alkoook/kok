import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TarneebSessionSummaryView } from '../../components/tarneeb/TarneebSessionSummary';
import { db } from '../../db/database';
import { buildTarneeb61SessionSummary, detectTarneeb61Records, tryBuildTarneeb61SessionSummary, type TarneebSessionSummary } from '../../games/tarneeb/analytics';
import { useGame } from '../../hooks/useGame';

export function TarneebSummaryPage() {
  const { gameId } = useParams(); const { game, rounds } = useGame(gameId); const navigate = useNavigate();
  const history = useLiveQuery(async () => ({ games: await db.games.where('gameType').equals('tarneeb-61').toArray(), rounds: await db.rounds.toArray() }), [], { games: [], rounds: [] });
  if (game === undefined) return <main className="page"><div className="surface h-80 animate-pulse"/></main>;
  if (!game || game.gameType !== 'tarneeb-61' || !game.teams) return <main className="page"><p>ملخص القعدة غير متوفر لهذه المباراة.</p></main>;
  const summary = buildTarneeb61SessionSummary(game, rounds);
  const previous = history.games.filter((item) => item.id !== game.id && item.status === 'completed' && item.teams).map((item) => tryBuildTarneeb61SessionSummary(item, history.rounds.filter((round) => round.gameId === item.id))).filter((item): item is TarneebSessionSummary => Boolean(item));
  const records = detectTarneeb61Records(summary, previous); const sessionNumber = history.games.filter((item) => item.createdAt <= game.createdAt).length;
  return <main className="page pb-12"><header className="mb-5 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)] shadow-soft" onClick={() => navigate(-1)} aria-label="رجوع"><ArrowRight/></button><div><span className="eyebrow">أرشيف البطولات والفضايح</span><h1 className="text-2xl font-black">ملخص القعدة</h1></div></header><TarneebSessionSummaryView summary={summary} records={records} sessionNumber={sessionNumber}/></main>;
}
