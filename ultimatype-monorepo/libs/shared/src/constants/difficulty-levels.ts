export const DIFFICULTY_LEVELS = [
  { level: 1, name: 'Minúscula', description: 'Solo minúsculas' },
  { level: 2, name: 'Mayúsculas', description: 'Minúsculas y mayúsculas' },
  { level: 3, name: 'Puntuación', description: 'Minúsculas, mayúsculas, acentos y puntuación' },
  { level: 4, name: 'Números', description: 'Todo lo anterior más números' },
  { level: 5, name: 'Símbolos', description: 'Todo lo anterior más símbolos' },
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 5;
}
