export const EXERCISES = [
  { id: 'bench', name: 'Bench Press' },
  { id: 'squat', name: 'Squat' },
  { id: 'deadlift', name: 'Deadlift' },
  { id: 'ohp', name: 'Overhead Press' },
] as const;

export type ExerciseId = (typeof EXERCISES)[number]['id'];

export type Unit = 'kg' | 'lb';

const LB_PER_KG = 2.20462;

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG;
}

export function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / LB_PER_KG;
}

/** "102.5 kg" / "225 lb" — at most one decimal, no trailing ".0". */
export function formatWeight(kg: number, unit: Unit): string {
  return `${formatNumber(fromKg(kg, unit))} ${unit}`;
}

export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}
