import type { GameSession, PlayerProfile } from '../../types';
import type { FastSessionSummary } from './summary';

export async function createFastGameCard(game: GameSession, profiles: Array<PlayerProfile | undefined> = [], summary?: FastSessionSummary): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر إنشاء البطاقة');
  const entries = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
  const name = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id;
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#18243a'); gradient.addColorStop(1, '#070b12'); context.fillStyle = gradient; context.fillRect(0, 0, 1080, 1350);
  context.direction = 'rtl'; context.textAlign = 'right'; context.fillStyle = '#2dd4bf'; context.font = '800 34px "Noto Sans Arabic Variable", Tahoma'; context.fillText('KOK · اللعبة إلها حساب', 970, 80);
  context.fillStyle = '#fff'; context.font = '900 72px "Noto Sans Arabic Variable", Tahoma'; context.fillText(game.gameType === 'cc' ? 'CC' : 'تركس سريعة', 970, 180);
  context.fillStyle = '#fbbf24'; context.font = '900 48px "Noto Sans Arabic Variable", Tahoma'; context.fillText(`الفائز: ${entries.filter(([, score]) => score === entries[0][1]).map(([id]) => name(id)).join(' و ')}`, 970, 280);
  for (const [index, [id, score]] of entries.entries()) {
    const y = 370 + index * 170;
    context.fillStyle = index === 0 ? '#153c38' : '#151f2f'; context.beginPath(); context.roundRect(80, y, 920, 130, 30); context.fill();
    const team = game.teams?.find((item) => item.id === id);
    const playerIds = team?.playerIds ?? [id];
    let avatarX = 900;
    for (const playerId of playerIds) {
      const player = game.players.find((item) => item.id === playerId);
      const profile = profiles.find((item) => item?.id === player?.profileId);
      context.save(); context.beginPath(); context.arc(avatarX, y + 65, 38, 0, Math.PI * 2); context.clip();
      if (profile?.photo) { const bitmap = await createImageBitmap(profile.photo); context.drawImage(bitmap, avatarX - 38, y + 27, 76, 76); bitmap.close(); }
      else { context.fillStyle = '#334155'; context.fillRect(avatarX - 38, y + 27, 76, 76); context.fillStyle = '#fff'; context.textAlign = 'center'; context.font = '900 28px Tahoma'; context.fillText(player?.name.slice(0, 1) ?? '?', avatarX, y + 75); }
      context.restore(); avatarX -= 58;
    }
    context.textAlign = 'right'; context.fillStyle = '#fff'; context.font = '800 32px "Noto Sans Arabic Variable", Tahoma'; context.fillText(`${index + 1}. ${name(id)}`, 720, y + 58);
    context.textAlign = 'left'; context.fillStyle = score >= 0 ? '#2dd4bf' : '#fb7185'; context.font = '900 42px Tahoma'; context.fillText(String(score), 150, y + 75); context.textAlign = 'right';
  }
  const highlight = summary?.titles[0] ? `${summary.titles[0].title}: ${summary.titles[0].subject}` : summary?.awards[0] ? `${summary.awards[0].title}: ${summary.awards[0].subject}` : undefined;
  const killerStatistic = summary?.funnyStatistics[0];
  const summaryLine = summary?.story[0];
  if (highlight) { context.fillStyle = '#fbbf24'; context.font = '800 30px "Noto Sans Arabic Variable", Tahoma'; context.fillText(`🏆 ${highlight}`, 970, 1080); }
  if (killerStatistic) { context.fillStyle = '#f8fafc'; context.font = '700 26px "Noto Sans Arabic Variable", Tahoma'; context.fillText(`📊 ${killerStatistic.label}: ${killerStatistic.value}`, 970, 1150); }
  if (summaryLine) { context.fillStyle = '#cbd5e1'; context.font = '600 22px "Noto Sans Arabic Variable", Tahoma'; context.fillText(summaryLine.slice(0, 85), 970, 1205); }
  context.fillStyle = '#94a3b8'; context.font = '600 24px "Noto Sans Arabic Variable", Tahoma'; context.fillText('محفوظة ومولّدة دون إنترنت', 970, 1280);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر حفظ البطاقة')), 'image/png', 1));
}

export async function shareFastGame(game: GameSession, profiles: Array<PlayerProfile | undefined> = [], summary?: FastSessionSummary): Promise<void> {
  const blob = await createFastGameCard(game, profiles, summary);
  const file = new File([blob], `kok-${game.gameType}-${game.id}.png`, { type: 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'نتيجة القعدة' }); return; }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
