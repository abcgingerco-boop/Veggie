// Weight calculation utilities

import { WeightCalculation, BagWeight } from './types';

const STANDARD_WEIGHT = 59;
const REFERENCE_WEIGHT = 60;

export function calculateNetWeight(bagWeights: number[]): WeightCalculation {
  const totalBags = bagWeights.length;
  const grossWeight = bagWeights.reduce((sum, w) => sum + w, 0);
  const baseWeight = STANDARD_WEIGHT * totalBags;

  let adjustment = 0;
  for (const weight of bagWeights) {
    if (weight < REFERENCE_WEIGHT) {
      adjustment -= (REFERENCE_WEIGHT - weight);
    } else if (weight > REFERENCE_WEIGHT) {
      adjustment += (weight - REFERENCE_WEIGHT);
    }
  }

  const netWeight = baseWeight + adjustment;

  return {
    totalBags,
    grossWeight: Math.round(grossWeight * 10) / 10,
    netWeight: Math.round(netWeight * 10) / 10
  };
}

// Calculate for grade-wise bags
export function calculateGradeWiseStats(bags: BagWeight[]) {
  const weights = bags.map(b => b.weight);
  return calculateNetWeight(weights);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Check if date is in allowed range (past 3 months, not future)
export function isDateAllowed(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate >= threeMonthsAgo && checkDate <= today;
}

// Check if date is in the future
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate > today;
}
