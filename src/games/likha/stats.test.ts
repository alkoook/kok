import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession, LikhaRoundInput } from '../../types';
import { calculateLikhaRound } from './engine';
import { calculateLikhaPartnershipStats, calculateLikhaPlayerStats } from './stats';

const players = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, profileId: `profile-${id}`, name: id.toUpperCase(), seat }));
const input: LikhaRoundInput = { players: players.map((player, index) => ({ playerId: player.id, heartsCount: index === 0 ? 13 : 0 })), specialCards: { jackDiamonds: { capturedBy: 'b', doubled: true }, queenSpades: { capturedBy: 'a', doubled: true }, kingClubs: { capturedBy: 'c', doubled: false }, tenDiamonds: { capturedBy: 'd', doubled: true } } };
const delta = calculateLikhaRound(input, players.map((player) => player.id));
const game = { id: 'g', gameType: 'likha', status: 'completed', players, createdAt: '', updatedAt: '', finishedAt: '', currentRound: 1, scores: delta, rulesSnapshot: { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: 30 } }, winnerIds: ['d'] } as GameSession;
const round = { id: 'r', gameId: 'g', index: 0, type: 'likha', input, scoreDelta: delta, scoreAfter: delta, createdAt: '' } as GameRound;

describe('Likha stats', () => {
  it('counts cards, hearts, wins, losses and round extremes', () => {
    const stats = calculateLikhaPlayerStats([game], [round]); const a = stats.find((item) => item.profileId === 'profile-a')!; const d = stats.find((item) => item.profileId === 'profile-d')!;
    expect(a).toMatchObject({ games: 1, losses: 1, totalHearts: 13, queenSpades: 1, doubledQueenSpades: 1, worstRoundScore: -39, limitBreaches: 1 });
    expect(d).toMatchObject({ wins: 1, tenDiamonds: 1, doubledTenDiamonds: 1, positiveTenPoints: 20, bestRoundScore: 20 });
  });
  it('credits partnership wins to both partners but keeps the queen on its actual eater', () => {
    const partnership = { ...game, id: 'team-game', likhaMode: 'partnership', teams: [{ id: 'ab', name: 'A+B', playerIds: ['a', 'b'] }, { id: 'cd', name: 'C+D', playerIds: ['c', 'd'] }], winnerIds: ['cd'] } as GameSession;
    const teamRound = { ...round, id: 'team-round', gameId: partnership.id } as GameRound;
    const individual = calculateLikhaPlayerStats([partnership], [teamRound]);
    expect(individual.find((item) => item.profileId === 'profile-a')).toMatchObject({ losses: 1, queenSpades: 1 });
    expect(individual.find((item) => item.profileId === 'profile-b')).toMatchObject({ losses: 1, queenSpades: 0 });
    expect(individual.find((item) => item.profileId === 'profile-c')).toMatchObject({ wins: 1 });
    expect(individual.find((item) => item.profileId === 'profile-d')).toMatchObject({ wins: 1 });
    expect(calculateLikhaPartnershipStats([partnership])).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'profile-a|profile-b', games: 1, losses: 1 }),
      expect.objectContaining({ key: 'profile-c|profile-d', games: 1, wins: 1 })
    ]));
  });
});
