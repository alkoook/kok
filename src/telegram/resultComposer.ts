import type { GameRound, GameSession, LikhaRoundInput, TelegramResultSnapshot } from '../types';
import { GAME_LABELS, scoreText } from '../utils';
import { buildTarneeb61Attempts } from '../games/tarneeb/analytics';
import { buildOfficialStandings } from '../results/standings';
import { calculateGameBanterAwards } from '../results/banterAwards';

export type TelegramGameResult = { title: string; sections: string[]; plainText: string; snapshot: TelegramResultSnapshot; metadata: { awardIds: string[]; roastLevel: 'light' | 'dirty' | 'disaster' } };

const roasts = {
  light: ['مو سيئة... بس لا تعمل حالك بطل.', 'نجوت هالمرة، لا نعرف كيف.', 'في لعب وفي الشي اللي عملته انت.'],
  dirty: ['شو هالخرا المنظم يا حمار؟', 'أداءك اليوم كان طيز ماشية عأربع ورقات.', 'كل رقم بالنتيجة عم يسبك لحالو.', 'دخل يلعب، طلع عامل حالو ممسحة للطاولة.', 'الحمار لو مسك محلك كان خسر بأناقة أكتر.', 'القعدة خلصت بس ريحة الخرا لساتها موجودة.'],
  disaster: ['يا خرا عهاللعب، حتى الطاولة صار بدا تعتذر من الباقيين.', 'إذا الغباء بالشدة إلو شهادة، انت عم توزع شهادات.', 'لك إير الحمار أرحم من اللي عملته بهالقعدة.', 'طيز الكلب عندها Decision Making أحسن من هاللقطات.', 'شو هالخرية؟ حدا يفهمنا كيف قدرت تجمع كل هالمصايب بقعدة وحدة.', 'فردة طيزي لو لعبت محلك كان إلها فرصة أكبر.']
} as const;

function hash(value: string) { let result = 2166136261; for (const character of value) { result ^= character.codePointAt(0) ?? 0; result = Math.imul(result, 16777619); } return result >>> 0; }
const pick = <T,>(items: readonly T[], key: string) => items[hash(key) % items.length];
const name = (game: GameSession, id: string) => game.players.find((player) => player.id === id)?.name ?? id;

function gameDetails(game: GameSession, rounds: GameRound[]) {
  const lines: string[] = [];
  if (game.gameType === 'tarneeb-61') {
    const failed = buildTarneeb61Attempts(game, rounds).filter((attempt) => !attempt.succeeded);
    if (failed.length) { const worst = [...failed].sort((a, b) => b.bid - a.bid)[0]; lines.push(`💀 الانكسارات: ${failed.length} · أكبرها ${name(game, worst.playerId)} بضمان ${worst.bid}`); }
    const broken = failed.filter((attempt) => attempt.bid === 7).length; if (broken) lines.push(`🤡 Broken 7: ${broken}`);
  }
  if (game.gameType === 'tarneeb-41') {
    const failures = rounds.filter((round) => round.type === 'tarneeb-41').flatMap((round) => 'entries' in round.input ? round.input.entries.filter((entry) => !entry.success).map((entry) => `${name(game, entry.playerId)} ضمان ${entry.bid}`) : []);
    if (failures.length) lines.push(`💥 انكسارات 41: ${failures.join(' · ')}`);
  }
  if (game.gameType === 'likha') {
    const likha = rounds.filter((round) => round.type === 'likha').map((round) => round.input as LikhaRoundInput);
    const countCard = (card: keyof LikhaRoundInput['specialCards']) => {
      const counts = new Map<string, { normal: number; doubled: number }>(); likha.forEach((input) => { const capture = input.specialCards[card]; const item = counts.get(capture.capturedBy) ?? { normal: 0, doubled: 0 }; item.normal += 1; if (capture.doubled) item.doubled += 1; counts.set(capture.capturedBy, item); }); return [...counts].map(([id, item]) => `${name(game, id)} ×${item.normal}${item.doubled ? ` (${item.doubled} مدبل)` : ''}`).join(' · ');
    };
    if (likha.length) { lines.push(`👸 Q♠: ${countCard('queenSpades')}`); lines.push(`♦ 10♦: ${countCard('tenDiamonds')}`); lines.push(`👴 K♣: ${countCard('kingClubs')}`); lines.push(`♦ J♦: ${countCard('jackDiamonds')}`); const hearts = Object.fromEntries(game.players.map((player) => [player.id, 0])); likha.forEach((input) => input.players.forEach((entry) => { hearts[entry.playerId] += entry.heartsCount; })); lines.push(`♥ الكوبا: ${game.players.map((player) => `${player.name} ${hearts[player.id]}`).join(' · ')}`); }
  }
  if ((game.gameType === 'cc' || game.gameType === 'trix-fast') && rounds.some((round) => round.type === 'lash' && 'oldMan' in round.input)) {
    const oldMen = rounds.filter((round) => round.type === 'lash' && 'oldMan' in round.input).map((round) => 'oldMan' in round.input ? round.input.oldMan : undefined).filter(Boolean);
    if (oldMen.length) lines.push(`🃏 الختيار: ${oldMen.map((oldMan) => `${name(game, oldMan!.eaterPlayerId)}${oldMan!.doubled ? ' ×2' : ''}`).join(' · ')}`);
  }
  return lines;
}

export function buildTelegramGameResult(game: GameSession, rounds: GameRound[], correction = false): TelegramGameResult {
  const revision = game.resultRevision ?? 1; const standings = buildOfficialStandings(game); const winners = standings.filter((entry) => entry.winner);
  const awards = calculateGameBanterAwards(game, rounds).slice(0, 3); const topSeverity = awards[0]?.severity ?? 0;
  const roastLevel = topSeverity >= 30 ? 'disaster' : topSeverity >= 10 ? 'dirty' : 'light'; const roastTarget = awards[0]?.playerId ?? standings.at(-1)?.playerIds[0] ?? '';
  const title = correction ? '⚠️ تصحيح نتيجة — KOK' : '🃏 KOK — نتيجة البرتية';
  const date = new Intl.DateTimeFormat('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(game.finishedAt ?? game.updatedAt));
  const resultLines = standings.map((entry) => `${entry.name}   ${scoreText(entry.score)}`);
  const sections = [
    title,
    `اللعبة:\n${GAME_LABELS[game.gameType]}`,
    `التاريخ:\n${date}`,
    `النهاية:\n${game.finishReason === 'manual_early_finish' ? 'فصلت' : 'نهاية طبيعية'}`,
    `النتيجة:\n${resultLines.join('\n')}`,
    winners.length > 1 ? `🤝 تعادل حقيقي:\n${winners.map((entry) => entry.name).join(' و ')}` : `👑 الفائز:\n${winners[0]?.name ?? 'تعادل'}`,
    ...gameDetails(game, rounds),
    ...awards.map((award) => `${award.emoji} ${award.title}\n${award.reason}`),
    `الحكم الرسمي:\n«${pick(roasts[roastLevel], `${game.id}:${revision}:${roastTarget}`)}»`,
    `🎴 KOK-${game.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0')}`
  ];
  const snapshot: TelegramResultSnapshot = { gameId: game.id, gameType: game.gameType, resultRevision: revision, correction, finishReason: game.finishReason ?? 'natural', finishedAt: game.finishedAt ?? game.updatedAt, players: game.players.map(({ id, name: playerName, profileId }) => ({ id, name: playerName, profileId })), standings, winnerIds: game.winnerIds ?? winners.map((entry) => entry.id), roundCount: rounds.filter((round) => round.type !== 'manual-adjustment').length };
  return { title, sections, plainText: sections.join('\n\n'), snapshot, metadata: { awardIds: awards.map((award) => award.id), roastLevel } };
}

export function splitTelegramMessage(text: string, maximum = 3700): string[] {
  if (text.length <= maximum) return [text]; const sections = text.split('\n\n'); const chunks: string[] = []; let current = '';
  for (const section of sections) { const candidate = current ? `${current}\n\n${section}` : section; if (candidate.length <= maximum) { current = candidate; continue; } if (current) chunks.push(current); if (section.length <= maximum) current = section; else { const codePoints = Array.from(section); while (codePoints.length > maximum) chunks.push(codePoints.splice(0, maximum).join('')); current = codePoints.join(''); } }
  if (current) chunks.push(current); return chunks;
}
