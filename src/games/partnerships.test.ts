import { describe, expect, it } from 'vitest';
import { fixedPartnershipMembers, fixedPartnershipPlayerIds } from './partnerships';

const players = ['Ahmad', 'Mohammad', 'Samer', 'Ziad'].map((name, seat) => ({ id: name.toLowerCase(), name, seat }));

describe('fixed partnership seating', () => {
  it('derives seat 1 + 3 versus seat 2 + 4 for Likha and CC creation', () => {
    expect(fixedPartnershipMembers(players).map((team) => team.map((player) => player.name))).toEqual([
      ['Ahmad', 'Samer'],
      ['Mohammad', 'Ziad']
    ]);
    expect(fixedPartnershipPlayerIds(players)).toEqual([
      ['ahmad', 'samer'],
      ['mohammad', 'ziad']
    ]);
  });
});
