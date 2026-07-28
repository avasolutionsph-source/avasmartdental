import { describe, expect, it } from 'vitest';
import { accessTier } from './access';

const PAID = '2026-07-19T00:00:00Z';

describe('accessTier', () => {
  it('is full before paid_until', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-18T00:00:00Z'))).toBe('full');
  });
  it('is grace within the grace window', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-24T00:00:00Z'))).toBe('grace');
  });
  it('is read_only past the grace window', () => {
    expect(accessTier(PAID, 7, 'active', new Date('2026-07-27T00:00:00Z'))).toBe('read_only');
  });
  it('is read_only when canceled regardless of dates', () => {
    expect(accessTier(PAID, 7, 'canceled', new Date('2026-07-01T00:00:00Z'))).toBe('read_only');
  });
  it('is full when paid_until is missing', () => {
    expect(accessTier(null, 7, 'active', new Date('2030-01-01T00:00:00Z'))).toBe('full');
  });
  it('is full when paid_until is unparseable', () => {
    expect(accessTier('not-a-date', 7, 'active')).toBe('full');
  });
});
