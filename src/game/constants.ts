import type { PhysicsTuning } from './types';

export const COURT = {
  width: 450,
  height: 1000,
  centerX: 225,
  halfwayY: 500,
  hoopTopY: 72,
  hoopBottomY: 928,
  hoopGap: 104,
  hoopScoreRadius: 14,
  hoopRimRadius: 54,
  hoopRimHeight: 28,
  hoopMaxHeight: 112,
  ballRadius: 40,
  wallThickness: 36,
  wallBounce: 0.84,
  rimBounce: 1.12,
} as const;

export const DEFAULT_TUNING: Readonly<PhysicsTuning> = {
  gravity: 520,
  flickThreshold: 420,
  shotPower: 1,
  bounce: 0.34,
};

export const RESET_SECONDS = 0.5;
export const WIN_SCORE = 10;
export const FIXED_STEP = 1 / 60;
