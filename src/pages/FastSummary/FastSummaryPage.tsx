import { ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { FastSessionSummary } from '../../components/fast/FastSessionSummary';
import { useGame } from '../../hooks/useGame';

export function FastSummaryPage() {
  const { gameId } = useParams();
  const { game, rounds } = useGame(gameId);
  const navigate = useNavigate();
  if (game === undefined) return <main className="page"><div className="surface h-80 animate-pulse"/></main>;
  if (!game || (game.gameType !== 'trix-fast' && game.gameType !== 'cc')) return <main className="page">الملخص غير موجود.</main>;
  return <main className="page"><header className="mb-5 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => navigate(-1)}><ArrowRight/></button><div><span className="eyebrow">النهاية الرسمية</span><h1 className="text-2xl font-black">ملخص القعدة</h1></div></header><FastSessionSummary game={game} rounds={rounds}/></main>;
}
