import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { KokLogo } from '../components/common/KokLogo';
import { AppShell } from '../components/layout/AppShell';
import { PwaStatus } from '../components/layout/PwaStatus';
import { db } from '../db/database';
import { GameDetailsPage } from '../pages/GameDetails/GameDetailsPage';
import { GamePage } from '../pages/Game/GamePage';
import { HistoryPage } from '../pages/History/HistoryPage';
import { HomePage } from '../pages/Home/HomePage';
import { NewGamePage } from '../pages/NewGame/NewGamePage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { StatsPage } from '../pages/Stats/StatsPage';
import { PlayersPage } from '../pages/Players/PlayersPage';

const LazyTarneebSummaryPage = lazy(() => import('../pages/TarneebSummary/TarneebSummaryPage').then((module) => ({ default: module.TarneebSummaryPage })));
const TarneebSummaryPage = () => <Suspense fallback={<main className="page"><div className="surface h-80 animate-pulse"/></main>}><LazyTarneebSummaryPage/></Suspense>;

export function App() {
  const settings = useLiveQuery(() => db.settings.get('main'));
  useEffect(() => {
    if (!settings) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', settings.theme === 'dark' || settings.theme === 'system' && media.matches);
    apply();
    if (settings.theme === 'system') media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings]);
  return <><Routes><Route element={<AppShell/>}><Route index element={<HomePage/>}/><Route path="new/:gameType" element={<NewGamePage/>}/><Route path="game/:gameId" element={<GamePage/>}/><Route path="details/:gameId" element={<GameDetailsPage/>}/><Route path="summary/:gameId" element={<TarneebSummaryPage/>}/><Route path="history" element={<HistoryPage/>}/><Route path="stats" element={<StatsPage/>}/><Route path="players" element={<PlayersPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes><PwaStatus/>{settings && <Modal open={!settings.onboardingSeen} title="أهلاً في KOK" onClose={() => db.settings.update('main', { onboardingSeen: true })}><div className="space-y-4"><div className="rounded-3xl bg-gradient-to-br from-slate-500/10 to-amber-500/5 p-6 text-center"><div className="mb-4 flex justify-center"><KokLogo size="medium"/></div><h2 className="text-2xl font-black">اللعبة إلها حساب.</h2><p className="muted mt-2">تركس وطرنيب وCC بسرعة، وكل مبارياتك محفوظة على جهازك.</p></div><div className="grid grid-cols-2 gap-3 text-center text-sm"><div className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5"><strong className="block">بدون إنترنت</strong><span className="muted">بعد التثبيت</span></div><div className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5"><strong className="block">حفظ تلقائي</strong><span className="muted">بعد كل جولة</span></div></div><Button className="w-full" size="lg" onClick={() => db.settings.update('main', { onboardingSeen: true })}>جاهزين، ابدأ</Button></div></Modal>}</>;
}
