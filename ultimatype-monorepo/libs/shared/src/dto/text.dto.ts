export interface TextResponse {
  id: string;
  level: number;
  language: string;
  content: string;
}

export interface DifficultyLevelResponse {
  level: number;
  name: string;
  description: string;
}
