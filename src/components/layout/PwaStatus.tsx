import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '../common/Button';
import { AudioLifecycle } from '../../audio/AudioLifecycle';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function PwaStatus() {
  const [installEvent, setInstallEvent] = useState<InstallEvent>();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>)>();
  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineHandler);
    const updater = registerSW({ onNeedRefresh: () => setUpdateReady(true) });
    setUpdateSW(() => updater);
    return () => { window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('online', online); window.removeEventListener('offline', offlineHandler); };
  }, []);
  return <>
    <AudioLifecycle/>
    {offline && <div className="fixed left-3 top-3 z-40 flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white"><WifiOff size={13}/> بدون إنترنت</div>}
    {installEvent && <aside className="surface fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-xl items-center gap-3 p-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint-500/10 text-mint-600"><Download/></div><div className="min-w-0 flex-1"><strong className="block">ثبّت KOK</strong><span className="muted text-xs">بيشتغل كتطبيق وحتى بدون إنترنت.</span></div><Button size="sm" onClick={async () => { await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(undefined); }}>تثبيت</Button></aside>}
    {updateReady && <aside className="surface fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-xl items-center gap-3 p-4"><div className="min-w-0 flex-1"><strong>نسخة جديدة من KOK جاهزة</strong></div><Button size="sm" icon={<RefreshCw size={16}/>} onClick={() => updateSW?.(true)}>تحديث الآن</Button></aside>}
  </>;
}
