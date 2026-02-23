import { describe, it, expect } from 'vitest';
import {
  calculateNetWeight,
  calculateGradeWiseStats,
  formatDate,
  formatDisplayDate,
  isDateAllowed,
  isFutureDate,
} from '@/lib/calculations';
import type { BagWeight } from '@/lib/types';

describe('calculateNetWeight', () => {
  it('returns zeros for empty array', () => {
    const result = calculateNetWeight([]);
    expect(result.totalBags).toBe(0);
    expect(result.grossWeight).toBe(0);
    expect(result.netWeight).toBe(0);
  });

  it('handles single bag at reference weight (60)', () => {
    const result = calculateNetWeight([60]);
    expect(result.totalBags).toBe(1);
    expect(result.grossWeight).toBe(60);
    expect(result.netWeight).toBe(59); // base = 59*1, adjustment = 0
  });

  it('handles single bag below reference (55)', () => {
    const result = calculateNetWeight([55]);
    expect(result.totalBags).toBe(1);
    expect(result.grossWeight).toBe(55);
    expect(result.netWeight).toBe(54); // base=59, adj=-(60-55)=-5, net=59-5=54
  });

  it('handles single bag above reference (65)', () => {
    const result = calculateNetWeight([65]);
    expect(result.totalBags).toBe(1);
    expect(result.grossWeight).toBe(65);
    expect(result.netWeight).toBe(64); // base=59, adj=+(65-60)=+5, net=59+5=64
  });

  it('handles mixed bags correctly', () => {
    const result = calculateNetWeight([55, 60, 65]);
    expect(result.totalBags).toBe(3);
    expect(result.grossWeight).toBe(180);
    // base=59*3=177, adj=(-5+0+5)=0, net=177
    expect(result.netWeight).toBe(177);
  });

  it('rounds to 1 decimal place', () => {
    const result = calculateNetWeight([60.3, 59.7]);
    expect(result.totalBags).toBe(2);
    // grossWeight = 120, rounded to 1 decimal
    expect(result.grossWeight).toBe(120);
    // base=118, adj=(0.3-0.3)=0, net=118
    expect(result.netWeight).toBe(118);
  });
});

describe('calculateGradeWiseStats', () => {
  it('extracts weights from BagWeight objects and calculates correctly', () => {
    const bags: BagWeight[] = [
      { id: '1', date: '2024-01-01', buyerId: 'b1', grade: 'A', bagNumber: 1, weight: 60, timestamp: 0 },
      { id: '2', date: '2024-01-01', buyerId: 'b1', grade: 'A', bagNumber: 2, weight: 55, timestamp: 0 },
    ];
    const result = calculateGradeWiseStats(bags);
    expect(result.totalBags).toBe(2);
    expect(result.grossWeight).toBe(115);
    // base=59*2=118, adj=(0+(-5))=-5, net=113
    expect(result.netWeight).toBe(113);
  });
});

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    // Use noon to avoid timezone shift issues with toISOString()
    const date = new Date(2024, 0, 15, 12, 0, 0);
    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2024, 2, 5, 12, 0, 0);
    expect(formatDate(date)).toBe('2024-03-05');
  });
});

describe('formatDisplayDate', () => {
  it('formats date string for display in en-IN locale', () => {
    const result = formatDisplayDate('2024-01-15');
    // en-IN format: "15 Jan 2024"
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });
});

describe('isDateAllowed', () => {
  it('allows today', () => {
    expect(isDateAllowed(new Date())).toBe(true);
  });

  it('rejects future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isDateAllowed(tomorrow)).toBe(false);
  });

  it('allows dates within past 3 months', () => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    expect(isDateAllowed(twoMonthsAgo)).toBe(true);
  });

  it('rejects dates older than 3 months', () => {
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    expect(isDateAllowed(fourMonthsAgo)).toBe(false);
  });
});

describe('isFutureDate', () => {
  it('returns false for today', () => {
    expect(isFutureDate(new Date())).toBe(false);
  });

  it('returns true for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isFutureDate(tomorrow)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isFutureDate(yesterday)).toBe(false);
  });
});
