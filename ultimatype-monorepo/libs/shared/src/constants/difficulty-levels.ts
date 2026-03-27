export const DIFFICULTY_LEVELS = [
  { level: 1, name: 'Minúscula', description: 'Solo minúsculas y espacios' },
  { level: 2, name: 'Mayúsculas', description: 'Minúsculas y mayúsculas' },
  { level: 3, name: 'Puntuación', description: 'Incluye signos de puntuación' },
  { level: 4, name: 'Números', description: 'Incluye números' },
  { level: 5, name: 'Símbolos', description: 'Incluye símbolos especiales' },
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 5;
}
