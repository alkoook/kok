import type { GameRound, GameSession, LikhaRoundInput, TelegramResultSnapshot } from '../types';
import { GAME_LABELS, scoreText } from '../utils';
import { buildTarneeb61Attempts } from '../games/tarneeb/analytics';
import { buildOfficialStandings } from '../results/standings';

export type TelegramGameResult = { title: string; sections: string[]; plainText: string; snapshot: TelegramResultSnapshot; metadata: { awardIds: string[]; roastLevel: 'light' | 'dirty' | 'disaster' } };

const separator = '━━━━━━━━━━━━━━';
const name = (game: GameSession, id: string) => game.players.find((player) => player.id === id)?.name ?? game.teams?.find((team) => team.id === id)?.name ?? id;
const cleanBullet = (text: string) => `• ${text}`;

function dateLabel(game: GameSession) {
  return new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(game.finishedAt ?? game.updatedAt));
}

function teamSection(game: GameSession) {
  if (!game.teams?.length) return undefined;
  return `👥 الفرق\n${game.teams.map((team) => team.playerIds.map((id) => name(game, id)).join(' + ')).join('\n')}`;
}

function tarneeb61Details(game: GameSession, rounds: GameRound[]) {
  const attempts = buildTarneeb61Attempts(game, rounds);
  return game.players.map((player) => {
    const own = attempts.filter((attempt) => attempt.playerId === player.id);
    if (!own.length) return undefined;
    const successes = own.filter((attempt) => attempt.succeeded);
    const kaboots = successes.filter((attempt) => attempt.actualTricks === 13).length;
    const brokenSevens = own.filter((attempt) => !attempt.succeeded && attempt.bid === 7).length;
    return cleanBullet(`${player.name}: ${successes.length} ضمان ناجح، ${own.length - successes.length} فاشل${kaboots ? `، 13 ×${kaboots}` : ''}${brokenSevens ? `، انكسار 7 ×${brokenSevens}` : ''}.`);
  }).filter((line): line is string => Boolean(line));
}

function tarneeb41Details(game: GameSession, rounds: GameRound[]) {
  const entries = rounds.filter((round) => round.type === 'tarneeb-41').flatMap((round) => 'entries' in round.input ? round.input.entries : []);
  return game.players.map((player) => {
    const own = entries.filter((entry) => entry.playerId === player.id);
    if (!own.length) return undefined;
    const successes = own.filter((entry) => entry.success).length;
    return cleanBullet(`${player.name}: ${successes} ضمان ناجح من ${own.length}.`);
  }).filter((line): line is string => Boolean(line));
}

function likhaDetails(game: GameSession, rounds: GameRound[]) {
  const likhaRounds = rounds.filter((round) => round.type === 'likha');
  const details = new Map(game.players.map((player) => [player.id, { hearts: 0, queen: 0, queenDoubled: 0, jack: 0, jackDoubled: 0, king: 0, kingDoubled: 0, ten: 0, tenDoubled: 0, best: Number.NEGATIVE_INFINITY, worst: Number.POSITIVE_INFINITY }]));
  const teamLines: string[] = [];
  likhaRounds.forEach((round) => {
    const input = round.input as LikhaRoundInput;
    input.players.forEach((entry) => { details.get(entry.playerId)!.hearts += entry.heartsCount; });
    const add = (id: string, card: 'queen' | 'jack' | 'king' | 'ten', doubled: boolean) => { const item = details.get(id); if (!item) return; item[card] += 1; if (doubled) item[`${card}Doubled`] += 1; };
    add(input.specialCards.queenSpades.capturedBy, 'queen', input.specialCards.queenSpades.doubled);
    add(input.specialCards.jackDiamonds.capturedBy, 'jack', input.specialCards.jackDiamonds.doubled);
    add(input.specialCards.kingClubs.capturedBy, 'king', input.specialCards.kingClubs.doubled);
    add(input.specialCards.tenDiamonds.capturedBy, 'ten', input.specialCards.tenDiamonds.doubled);
    Object.entries(round.scoreDelta).forEach(([id, score]) => { const item = details.get(id); if (item) { item.best = Math.max(item.best, score); item.worst = Math.min(item.worst, score); } });
    if (input.partnership && game.teams) {
      const cardLabel: Record<keyof LikhaRoundInput['specialCards'], string> = { queenSpades: 'Q♠', tenDiamonds: '10♦', kingClubs: 'K♣', jackDiamonds: 'J♦' };
      const facts = game.teams.map((team) => { const hearts = input.partnership!.enteredTeamId === team.id ? input.partnership!.enteredTeamHearts : 13 - input.partnership!.enteredTeamHearts; const owned = (Object.keys(input.specialCards) as Array<keyof LikhaRoundInput['specialCards']>).filter((card) => input.partnership!.cardTeams[card] === team.id).map((card) => `${cardLabel[card]}${input.specialCards[card].doubled ? ' ×2' : ''}`); return `${team.name}: ♥ ${hearts}${owned.length ? ` · ${owned.join(' · ')}` : ''}`; });
      teamLines.push(cleanBullet(`جولة ${round.index + 1} — ${facts.join(' | ')}.`));
    }
  });
  const playerLines = game.players.map((player) => {
    const item = details.get(player.id)!; const facts: string[] = [];
    if (item.queen) facts.push(`Q♠ ×${item.queen}${item.queenDoubled ? ` (${item.queenDoubled} مدبلة)` : ''}`);
    if (item.jack) facts.push(`J♦ ×${item.jack}${item.jackDoubled ? ` (${item.jackDoubled} مدبل)` : ''}`);
    if (item.king) facts.push(`K♣ ×${item.king}${item.kingDoubled ? ` (${item.kingDoubled} مدبل)` : ''}`);
    if (item.ten) facts.push(`10♦ ×${item.ten}${item.tenDoubled ? ` (${item.tenDoubled} مدبل)` : ''}`);
    if (item.hearts) facts.push(`♥ ${item.hearts}`);
    if (Number.isFinite(item.best)) facts.push(`أفضل جولة ${item.best}، أسوأ جولة ${item.worst}`);
    return facts.length ? cleanBullet(`${player.name}: ${facts.join(' · ')}.`) : undefined;
  }).filter((line): line is string => Boolean(line));
  return [...teamLines, ...playerLines];
}

function fastDetails(game: GameSession, rounds: GameRound[]) {
  const lines: string[] = [];
  rounds.filter((round) => round.type === 'lash' && 'oldMan' in round.input).forEach((round) => {
    if (!('oldMan' in round.input)) return;
    lines.push(cleanBullet(`${name(game, round.input.oldMan.eaterPlayerId)} أخذ الختيار${round.input.oldMan.doubled ? ' المدبل' : ''}.`));
  });
  rounds.filter((round) => round.type === 'trix-ranking' && 'finishingOrder' in round.input).forEach((round) => {
    if ('finishingOrder' in round.input) lines.push(cleanBullet(`ترتيب التركس: ${round.input.finishingOrder.map((id, index) => `${index + 1}. ${name(game, id)}`).join('، ')}.`));
  });
  return lines;
}

function gameDetails(game: GameSession, rounds: GameRound[]) {
  if (game.gameType === 'tarneeb-61') return tarneeb61Details(game, rounds);
  if (game.gameType === 'tarneeb-41') return tarneeb41Details(game, rounds);
  if (game.gameType === 'likha') return likhaDetails(game, rounds);
  if (game.gameType === 'cc' || game.gameType === 'trix-fast') return fastDetails(game, rounds);
  return [];
}

function contributionLines(game: GameSession, rounds: GameRound[]) {
  const totals = new Map<string, number>();
  rounds.forEach((round) => Object.entries(round.scoreDelta).forEach(([id, score]) => totals.set(id, (totals.get(id) ?? 0) + score)));
  const entries = [...totals].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const best = entries[0]; const worst = entries.at(-1)!;
  return [`⭐ أبرز أداء\n${name(game, best[0])} — أفضل مساهمة مسجلة (${scoreText(best[1])}).`, `📉 أكبر تعثر\n${name(game, worst[0])} — أقل مساهمة مسجلة (${scoreText(worst[1])}).`];
}

export function buildTelegramGameResult(game: GameSession, rounds: GameRound[], correction = false): TelegramGameResult {
  const revision = game.resultRevision ?? 1; const standings = buildOfficialStandings(game); const winners = standings.filter((entry) => entry.winner);
  const title = correction ? '⚠️ تصحيح نتيجة — KOK' : '🃏 KOK';
  const resultLines = standings.map((entry, index) => `${['🥇', '🥈', '🥉', '4.'][index] ?? `${index + 1}.`} ${entry.name}    ${scoreText(entry.score)}`);
  const details = gameDetails(game, rounds);
  const sections = [
    title,
    separator,
    `🎴 اللعبة\n${GAME_LABELS[game.gameType]}${game.gameType === 'likha' ? ` — ${game.likhaMode === 'partnership' ? 'شراكة' : 'يهودية'}` : ''}`,
    `📅 التاريخ\n${dateLabel(game)}`,
    `🏁 النهاية\n${game.finishReason === 'manual_early_finish' ? 'فصلت' : 'نهاية طبيعية'}`,
    teamSection(game),
    `📊 النتيجة النهائية\n${resultLines.join('\n')}`,
    winners.length > 1 ? `🤝 تعادل\n${winners.map((entry) => entry.name).join(' و ')}` : `👑 الفائز\n${winners[0]?.name ?? 'لا يوجد'}`,
    details.length ? `${separator}\n📌 تفاصيل القعدة\n\n${details.join('\n')}` : undefined,
    ...contributionLines(game, rounds),
    separator,
    'KOK'
  ].filter((section): section is string => Boolean(section));
  const snapshot: TelegramResultSnapshot = { gameId: game.id, gameType: game.gameType, resultRevision: revision, correction, finishReason: game.finishReason ?? 'natural', finishedAt: game.finishedAt ?? game.updatedAt, players: game.players.map(({ id, name: playerName, profileId }) => ({ id, name: playerName, profileId })), standings, winnerIds: game.winnerIds ?? winners.map((entry) => entry.id), roundCount: rounds.filter((round) => round.type !== 'manual-adjustment').length };
  return { title, sections, plainText: sections.join('\n\n'), snapshot, metadata: { awardIds: [], roastLevel: 'light' } };
}

export function splitTelegramMessage(text: string, maximum = 3700): string[] {
  if (text.length <= maximum) return [text]; const sections = text.split('\n\n'); const chunks: string[] = []; let current = '';
  for (const section of sections) { const candidate = current ? `${current}\n\n${section}` : section; if (candidate.length <= maximum) { current = candidate; continue; } if (current) chunks.push(current); if (section.length <= maximum) current = section; else { const codePoints = Array.from(section); while (codePoints.length > maximum) chunks.push(codePoints.splice(0, maximum).join('')); current = codePoints.join(''); } }
  if (current) chunks.push(current); return chunks;
}
