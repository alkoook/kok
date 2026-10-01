import type { TarneebSessionSummary } from './analytics';

export type TarneebShareCardModel = {
  date: string;
  winner: string;
  score: string;
  rounds: string;
  story: string;
  highlights: string[];
};

export function buildTarneebShareCardModel(summary: TarneebSessionSummary): TarneebShareCardModel {
  const winner = summary.teams.filter((team) => summary.winnerTeamIds.includes(team.id)).flatMap((team) => team.playerIds).map((id) => summary.game.players.find((player) => player.id === id)?.name).filter(Boolean).join(' + ');
  const score = summary.teams.map((team) => summary.game.scores[team.id] ?? 0).join(' — ');
  const highlights = [...summary.awards.filter((award) => award.category === 'glory').slice(0, 3), ...summary.awards.filter((award) => award.category === 'roast').slice(0, 1)].map((award) => `${award.emoji} ${award.title}: ${award.playerIds?.map((id) => summary.game.players.find((player) => player.id === id)?.name).filter(Boolean).join(' و') ?? summary.teams.find((team) => team.id === award.teamId)?.name ?? ''}`);
  return { date: new Intl.DateTimeFormat('ar-SY', { dateStyle: 'long' }).format(new Date(summary.game.createdAt)), winner, score, rounds: `${summary.roundCount} جولة`, story: summary.story, highlights };
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  context.beginPath(); context.roundRect(x, y, width, height, radius); context.fillStyle = fill; context.fill();
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = 2; context.stroke(); }
}

function wrapRtl(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = '';
  words.forEach((word) => { const next = line ? `${line} ${word}` : word; if (context.measureText(next).width <= maxWidth) line = next; else { if (line) lines.push(line); line = word; } });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => { const clipped = index === maxLines - 1 && lines.length > maxLines ? `${value}…` : value; context.fillText(clipped, x, y + index * lineHeight); });
  return Math.min(lines.length, maxLines) * lineHeight;
}

export async function createTarneebShareCardPng(summary: TarneebSessionSummary) {
  await document.fonts?.ready;
  const model = buildTarneebShareCardModel(summary); const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext('2d'); if (!context) throw new Error('تعذر إنشاء صورة الملخص');
  const gradient = context.createLinearGradient(0, 0, 1080, 1350); gradient.addColorStop(0, '#192231'); gradient.addColorStop(.55, '#0c1320'); gradient.addColorStop(1, '#070b12'); context.fillStyle = gradient; context.fillRect(0, 0, 1080, 1350);
  context.direction = 'rtl'; context.textAlign = 'right'; context.textBaseline = 'top';
  context.fillStyle = 'rgba(245, 185, 66, .12)'; context.beginPath(); context.arc(100, 110, 260, 0, Math.PI * 2); context.fill(); context.beginPath(); context.arc(1010, 1250, 350, 0, Math.PI * 2); context.fill();
  context.font = '800 32px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#d6ad60'; context.fillText('KOK · اللعبة إلها حساب', 980, 68);
  context.font = '900 58px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#fffdf8'; context.fillText('🃏 ملخص القعدة', 980, 128);
  context.font = '600 27px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#aab5c6'; context.fillText(model.date, 980, 208);
  roundedRect(context, 70, 276, 940, 300, 38, '#131d2c', 'rgba(214,173,96,.45)');
  context.font = '800 30px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#d6ad60'; context.fillText('👑 الفائزون', 940, 320);
  context.font = '900 46px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#fffdf8'; context.fillText(model.winner || 'تعادل', 940, 380);
  context.direction = 'ltr'; context.textAlign = 'center'; context.font = '900 92px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#f4c86f'; context.fillText(model.score, 540, 448);
  context.direction = 'rtl'; context.textAlign = 'right'; context.font = '700 25px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#aab5c6'; context.fillText(model.rounds, 940, 525);
  let y = 626; context.font = '900 32px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#fffdf8'; context.fillText('أبطال وفضايح القعدة', 970, y); y += 66;
  model.highlights.slice(0, 4).forEach((highlight) => { roundedRect(context, 70, y, 940, 72, 22, '#151f2f', 'rgba(255,255,255,.08)'); context.font = '800 26px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#f5f2ea'; wrapRtl(context, highlight, 970, y + 18, 860, 36, 1); y += 88; });
  context.font = '900 30px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#d6ad60'; context.fillText('حكاية القعدة', 970, 1070);
  context.font = '650 25px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#dbe2ec'; wrapRtl(context, model.story, 970, 1120, 880, 43, 4);
  context.font = '600 20px "Noto Sans Arabic Variable", Tahoma, sans-serif'; context.fillStyle = '#758297'; context.fillText('صُنعت داخل KOK · تعمل بدون إنترنت', 970, 1300);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر حفظ صورة الملخص')), 'image/png', 1));
}

export async function shareTarneebSummary(summary: TarneebSessionSummary, preparedBlob?: Blob) {
  const blob = preparedBlob ?? await createTarneebShareCardPng(summary); const file = new File([blob], `kok-${summary.gameId}.png`, { type: 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'ملخص القعدة', text: summary.verdict }); return 'shared' as const; }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); return 'downloaded' as const;
}
