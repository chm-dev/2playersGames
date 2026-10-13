import type { PhysicsTuning } from './types';

export const COURT = {
  width: 600,
  height: 1000,
  centerX: 300,
  halfwayY: 500,
  hoopTopY: 48,
  hoopBottomY: 952,
  hoopGap: 138,
  hoopScoreWidth: 48,
  hoopRimHeight: 28,
  hoopMaxHeight: 112,
  ballRadius: 23,
  wallBounce: 0.84,
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
