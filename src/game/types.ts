export type GameStatus = 'ready' | 'playing' | 'gameover';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bird {
  position: Position;
  velocity: number;
  rotation: number;
}

export interface Pipe {
  id: string;
  x: number;
  topHeight: number;
  passed: boolean;
}

export interface GameState {
  status: GameStatus;
  score: number;
  bestScore: number;
  bird: Bird;
  pipes: Pipe[];
  groundX: number;
}
