import { describe, expect, it } from 'vitest';
import { normalizeReactionSkeleton } from './messages';
import { OLD_MAN_FACTORY_COUNTS, OLD_MAN_FACTORY_RULES } from './oldManMessages';

describe('مصنع رسائل الختيار الجديد', () => {
  it('يوفر الأعداد المطلوبة بدقة', () => {
    expect(OLD_MAN_FACTORY_COUNTS).toEqual({ normal: 50, doubled: 50, owner: 40, 'owner-doubled': 50, partner: 30, opponent: 30, repeat: 40, 'repeat-doubled': 40, magnet: 40, historical: 20 });
    expect(OLD_MAN_FACTORY_RULES).toHaveLength(390);
  });
  it('لا يشغل أي معرف من المصنع المتقاعد', () => {
    expect(OLD_MAN_FACTORY_RULES.every((message) => message.id.startsWith('old-man-v2-'))).toBe(true);
    expect(OLD_MAN_FACTORY_RULES.some((message) => /^old-man-(owner|partner|opponent|repeated)-/.test(message.id))).toBe(false);
  });
  it('يوزع المستويات بالمقادير الثابتة', () => {
    const distribution = Object.fromEntries([1, 2, 3, 4].map((level) => [level, OLD_MAN_FACTORY_RULES.filter((message) => message.intensity === level).length]));
    expect(distribution).toEqual({ 1: 95, 2: 95, 3: 125, 4: 75 });
  });
  it('لا يتضمن إهانات عائلية أو مجموعات محمية أو تهديداً', () => {
    const forbidden = /(?:^|\s)(أم|أبو|أبوه|أبوك|أخت|زوجة|ولاد|أولاد|عيلة|دين|طائفة|عرق|قتل|اذبح)(?:\s|[،؛.!؟]|$)/u;
    expect(OLD_MAN_FACTORY_RULES.filter((message) => forbidden.test(message.template))).toEqual([]);
  });
  it('لكل رسالة معرف وقالب بنيوي ويمكن منع تكرار الاسم داخل القالب', () => {
    expect(new Set(OLD_MAN_FACTORY_RULES.map((message) => message.id)).size).toBe(390);
    expect(normalizeReactionSkeleton('الختيار مسجل عند {player}')).toBe(normalizeReactionSkeleton('الختيار مسجل عند {owner}'));
  });
});
