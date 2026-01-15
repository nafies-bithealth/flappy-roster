import { create } from 'zustand';
import { GameStatus, GameState } from '../game/types';

interface GameStore extends GameState {
  setStatus: (status: GameStatus) => void;
  setScore: (score: number) => void;
  incrementScore: () => void;
  setBestScore: (score: number) => void;
  resetGame: () => void;
  setBirdPosition: (y: number, velocity: number, rotation: number) => void;
  setPipes: (pipes: any[]) => void;
  setGroundX: (x: number) => void;
}

const INITIAL_STATE: Omit<GameState, 'bestScore'> = {
  status: 'ready',
  score: 0,
  bird: {
    position: { x: 50, y: 300 },
    velocity: 0,
    rotation: 0,
  },
  pipes: [],
  groundX: 0,
};

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL_STATE,
  bestScore: parseInt(localStorage.getItem('flappy-best-score') || '0', 10),

  setStatus: (status) => set({ status }),
  setScore: (score) => set({ score }),
  incrementScore: () => set((state) => {
    const newScore = state.score + 1;
    const newBestScore = Math.max(newScore, state.bestScore);
    if (newBestScore > state.bestScore) {
      localStorage.setItem('flappy-best-score', newBestScore.toString());
    }
    return { score: newScore, bestScore: newBestScore };
  }),
  setBestScore: (bestScore) => {
    localStorage.setItem('flappy-best-score', bestScore.toString());
    set({ bestScore });
  },
  resetGame: () => set((state) => ({
    ...INITIAL_STATE,
    bestScore: state.bestScore,
  })),
  setBirdPosition: (y, velocity, rotation) => set((state) => ({
    bird: { ...state.bird, position: { ...state.bird.position, y }, velocity, rotation }
  })),
  setPipes: (pipes) => set({ pipes }),
  setGroundX: (groundX) => set({ groundX }),
}));
