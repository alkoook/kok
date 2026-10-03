import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../db/database';
import { audioEngine } from './audioEngine';

export function AudioLifecycle() {
  const location = useLocation();
  useEffect(() => { const unlock = () => { void audioEngine.unlock(); }; const click = async (event: MouseEvent) => { if (!(event.target as Element | null)?.closest('button,a')) return; const settings = await db.settings.get('main'); if (settings?.uiSoundsEnabled) void audioEngine.playEvent('ui-tap'); }; const visibility = () => { if (document.hidden) audioEngine.stopAll(); }; window.addEventListener('pointerdown', unlock, { once: true, capture: true }); window.addEventListener('keydown', unlock, { once: true, capture: true }); document.addEventListener('click', click, true); document.addEventListener('visibilitychange', visibility); return () => { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); document.removeEventListener('click', click, true); document.removeEventListener('visibilitychange', visibility); }; }, []);
  useEffect(() => { audioEngine.stopReactionAudio(); }, [location.pathname]);
  return null;
}
