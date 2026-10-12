export type Side = 'north' | 'south';
export type BallMode = 'free' | 'held';
export type MatchPhase = 'playing' | 'resetting' | 'gameOver';

export interface PhysicsTuning {
  gravity: number;
  flickThreshold: number;
  shotPower: number;
  bounce: number;
}

export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mode: BallMode;
  flightLocked: boolean;
  landed: boolean;
  shooter: Side | null;
  heldBy: Side | null;
}

export interface MatchState {
  score: Record<Side, number>;
  phase: MatchPhase;
  resetRemaining: number;
  winner: Side | null;
  lastScorer: Side | null;
  message: string;
  ball: BallState;
}

export interface Point {
  x: number;
  y: number;
}
