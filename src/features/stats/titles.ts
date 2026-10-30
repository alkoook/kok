import { calculateLikhaPlayerStats } from '../../games/likha/stats';
import { playerStats } from '../../players/roster';
import type { GameRound, GameSession, PlayerProfile } from '../../types';
import { calculateGameBanterAwards, type BanterAwardId } from '../../results/banterAwards';

export type StatsAward = { id: string; emoji: string; title: string; profileIds: string[]; reason: string; tone: 'glory' | 'roast' };

function leaders<T>(rows: T[], value: (row: T) => number, eligible: (row: T) => boolean = () => true, direction: 'max' | 'min' = 'max') {
  const candidates = rows.filter(eligible); if (!candidates.length) return [];
  const best = direction === 'max' ? Math.max(...candidates.map(value)) : Math.min(...candidates.map(value)); return candidates.filter((row) => value(row) === best);
}

export function calculateStatsAwards(profiles: PlayerProfile[], games: GameSession[], rounds: GameRound[]): StatsAward[] {
  const rows = profiles.map((profile) => ({ profile, stats: playerStats(profile.id, games, rounds) })).filter((row) => row.stats.games > 0);
  const likha = calculateLikhaPlayerStats(games, rounds); const awards: StatsAward[] = [];
  const add = <T,>(id: string, emoji: string, title: string, winners: T[], profileId: (row: T) => string, reason: string, tone: StatsAward['tone']) => { if (winners.length) awards.push({ id, emoji, title, profileIds: winners.map(profileId), reason, tone }); };
  const king = leaders(rows, (row) => row.stats.wins, (row) => row.stats.wins > 0); add('table-king', '👑', 'ملك الطاولة', king, (row) => row.profile.id, `${king[0]?.stats.wins ?? 0} قعدات محسومة`, 'glory');
  const executioner = leaders(rows, (row) => row.stats.wins / row.stats.games, (row) => row.stats.games >= 4 && row.stats.wins / row.stats.games >= .6); add('executioner', '🔥', 'نجم القعدة', executioner, (row) => row.profile.id, `${Math.round((executioner[0]?.stats.wins ?? 0) / Math.max(1, executioner[0]?.stats.games ?? 1) * 100)}% فوز`, 'glory');
  const losses = leaders(rows, (row) => row.stats.losses, (row) => row.stats.losses >= 2); add('official-donkey', '🐴', 'أكثر تعثراً', losses, (row) => row.profile.id, `${losses[0]?.stats.losses ?? 0} خسارات مسجلة`, 'roast');
  const oldMan = leaders(rows, (row) => row.stats.oldMan, (row) => row.stats.oldMan > 0); add('old-man-bin', '🃏', 'جامع الختيار', oldMan, (row) => row.profile.id, `${oldMan[0]?.stats.oldMan ?? 0} ختيار مأكول`, 'roast');
  const lash = leaders(rows, (row) => row.stats.worstLash ?? 0, (row) => row.stats.worstLash !== undefined, 'min'); add('table-mop', '📉', 'أصعب لطشة', lash, (row) => row.profile.id, `أسوأ لطشة ${lash[0]?.stats.worstLash ?? 0}`, 'roast');
  const last = leaders(rows, (row) => row.stats.trixRanks[3], (row) => row.stats.trixRanks[3] > 0); add('chair', '🪑', 'أكثر مركز رابع', last, (row) => row.profile.id, `${last[0]?.stats.trixRanks[3] ?? 0} مرات بالمركز الأخير`, 'roast');
  const queen = leaders(likha, (row) => row.queenSpades, (row) => row.queenSpades > 0); add('queen-magnet', '🧲', 'مغناطيس البنت', queen, (row) => row.profileId, `${queen[0]?.queenSpades ?? 0} بنت بستوني`, 'roast');
  const doubledQueen = leaders(likha, (row) => row.doubledQueenSpades, (row) => row.doubledQueenSpades > 0); add('queen-crushed', '💀', 'نصيب البنت المدبلة', doubledQueen, (row) => row.profileId, `${doubledQueen[0]?.doubledQueenSpades ?? 0} بنت مدبلة`, 'roast');
  const hearts = leaders(likha, (row) => row.totalHearts, (row) => row.totalHearts > 0); add('hearts-eater', '♥', 'جامع الكوبا', hearts, (row) => row.profileId, `${hearts[0]?.totalHearts ?? 0} كوباية`, 'roast');
  const ten = leaders(likha, (row) => row.tenDiamonds, (row) => row.tenDiamonds > 0); add('ten-hunter', '♦', 'صياد العشرة', ten, (row) => row.profileId, `${ten[0]?.tenDiamonds ?? 0} عشرات`, 'glory');
  const lucky = leaders(likha, (row) => row.positiveTenPoints, (row) => row.positiveTenPoints > 0); add('lucky', '🍀', 'محظوظ القعدة', lucky, (row) => row.profileId, `+${lucky[0]?.positiveTenPoints ?? 0} من العشرة`, 'glory');
  const grave = leaders(likha, (row) => row.averageFinalScore, (row) => row.games >= 2, 'min'); add('grave-digger', '📉', 'أصعب متوسط', grave, (row) => row.profileId, `متوسط ليخة ${Math.round(grave[0]?.averageFinalScore ?? 0)}`, 'roast');
  const gameAwards = games.filter((game) => game.status === 'completed').flatMap((game) => calculateGameBanterAwards(game, rounds).map((award) => ({ award, profileId: game.players.find((player) => player.id === award.playerId)?.profileId }))).filter((item): item is { award: ReturnType<typeof calculateGameBanterAwards>[number]; profileId: string } => Boolean(item.profileId));
  const awardDefinitions: Array<{ id: BanterAwardId; emoji: string; title: string }> = [
    { id: 'largest-setback', emoji: '📉', title: 'أكبر تعثر' }, { id: 'hardest-round', emoji: '📊', title: 'أصعب جولة' },
    { id: 'queen-magnet', emoji: '🧲', title: 'مغناطيس البنت' }, { id: 'last-place', emoji: '🪑', title: 'المركز الأخير' }, { id: 'rough-session', emoji: '🧩', title: 'قعدة صعبة' }
  ];
  awardDefinitions.forEach((definition) => {
    const counts = new Map<string, number>(); gameAwards.filter((item) => item.award.id === definition.id).forEach((item) => counts.set(item.profileId, (counts.get(item.profileId) ?? 0) + 1));
    const maximum = Math.max(0, ...counts.values()); if (!maximum) return;
    awards.push({ id: `banter-${definition.id}`, emoji: definition.emoji, title: definition.title, profileIds: [...counts].filter(([, count]) => count === maximum).map(([id]) => id), reason: `${maximum} مرة من نتائج فعلية`, tone: 'roast' });
  });
  return awards;
}
