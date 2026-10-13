import { describe, expect, it } from 'vitest';
import { COURT, DEFAULT_TUNING } from './constants';
import { GameSimulation, openingBallY, scoreAtGoal, sideAt } from './simulation';

describe('court rules', () => {
  it('assigns halves at the center line', () => {
    expect(sideAt(COURT.halfwayY - 1)).toBe('north');
    expect(sideAt(COURT.halfwayY)).toBe('south');
  });

  it('places opening balls in either selected half', () => {
    expect(openingBallY('north', 0.5)).toBeLessThan(COURT.halfwayY);
    expect(openingBallY('south', 0.5)).toBeGreaterThan(COURT.halfwayY);
    const northMatch = new GameSimulation(() => 0.2);
    const southMatch = new GameSimulation(() => 0.8);
    expect(northMatch.state.ball.y).toBeLessThan(COURT.halfwayY);
    expect(southMatch.state.ball.y).toBeGreaterThan(COURT.halfwayY);
  });

  it('awards only a valid pass through the opponent hoop', () => {
    expect(scoreAtGoal(COURT.centerX, COURT.hoopBottomY, 60, -10, 'north')).toBe('north');
    expect(scoreAtGoal(COURT.centerX, COURT.hoopTopY, 60, -10, 'south')).toBe('south');
    expect(scoreAtGoal(COURT.centerX + COURT.hoopScoreRadius + 1, COURT.hoopBottomY, 60, -10, 'north')).toBeNull();
    expect(scoreAtGoal(COURT.centerX, COURT.hoopBottomY, 60, 10, 'north')).toBeNull();
    expect(scoreAtGoal(COURT.centerX, COURT.hoopBottomY, 10, -10, 'north')).toBeNull();
    expect(scoreAtGoal(COURT.centerX, COURT.hoopBottomY, 60, -10, 'south')).toBeNull();
  });
});

describe('local touch and flick simulation', () => {
  it('grabs only a free ball in its half', () => {
    const game = new GameSimulation(() => 0.2);
    const { ball } = game.state;
    expect(game.tryGrab({ x: ball.x, y: ball.y })).toBe(true);
    expect(game.state.ball.heldBy).toBe('north');
    expect(game.tryGrab({ x: ball.x, y: ball.y })).toBe(false);
  });

  it('classifies a slow release as a live soft drop', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    expect(game.release(90, 40)).toBe('drop');
    expect(game.state.ball.flightLocked).toBe(false);
    expect(game.state.ball.vz).toBeGreaterThan(0);
  });

  it('locks a fast flick until its first ground impact', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    expect(game.release(0, 900)).toBe('shot');
    expect(game.state.ball.flightLocked).toBe(true);
    expect(game.tryGrab({ x: game.state.ball.x, y: game.state.ball.y })).toBe(false);
    for (let index = 0; index < 180; index += 1) game.tick(1 / 60);
    expect(game.state.ball.flightLocked).toBe(false);
    expect(game.state.ball.landed).toBe(true);
  });

  it('keeps a shot locked through a wrong-end hoop-lane rebound', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.release(0, -900);
    for (let index = 0; index < 24; index += 1) game.tick(1 / 60);
    expect(game.state.ball.y).toBeGreaterThan(COURT.hoopTopY);
    expect(game.state.ball.flightLocked).toBe(true);
    expect(game.tryGrab({ x: game.state.ball.x, y: game.state.ball.y - game.state.ball.z })).toBe(false);
  });

  it('rebounds a shot from the side wall', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: 70, y: 300 });
    game.release(-900, 0);
    for (let frame = 0; frame < 30; frame += 1) game.tick(1 / 60);
    expect(game.state.ball.x).toBeGreaterThan(70);
    expect(game.state.ball.vx).toBeGreaterThan(0);
  });

  it('keeps a rising ball inside the visible north court edge when it rebounds', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: 100, y: 100 });
    game.release(0, -900);
    for (let frame = 0; frame < 30 && game.state.ball.vy < 0; frame += 1) game.tick(1 / 60);

    const reboundBall = game.state.ball;
    const visualRadius = COURT.ballRadius + Math.min(reboundBall.z * 0.035, 12);
    expect(reboundBall.y - reboundBall.z - visualRadius).toBeGreaterThanOrEqual(COURT.wallThickness / 2 - 1);
  });

  it('keeps a rising ball inside the visible south court edge when it rebounds', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: 100, y: 900 });
    game.release(0, 900);
    for (let frame = 0; frame < 30 && game.state.ball.vy > 0; frame += 1) game.tick(1 / 60);

    const reboundBall = game.state.ball;
    const visualRadius = COURT.ballRadius + Math.min(reboundBall.z * 0.035, 12);
    expect(reboundBall.y - reboundBall.z + visualRadius).toBeLessThanOrEqual(COURT.height - COURT.wallThickness / 2 + 1);
  });

  it('keeps an idle ball on the ground plane', () => {
    const game = new GameSimulation(() => 0.2);
    for (let index = 0; index < 120; index += 1) game.tick(1 / 60);
    expect(game.state.ball.z).toBe(0);
    expect(game.state.ball.vz).toBe(0);
  });

  it('scores a centered flick and readies the ball in the opponent half', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: COURT.centerX, y: 519 });
    expect(game.release(0, 600)).toBe('shot');
    let visualYAtScore = Number.NaN;
    for (let index = 0; index < 140; index += 1) {
      game.tick(1 / 60);
      if (game.state.score.north > 0 && Number.isNaN(visualYAtScore)) {
        visualYAtScore = game.state.ball.y - game.state.ball.z;
      }
    }
    expect(game.state.score.north).toBe(1);
    expect(visualYAtScore).toBeGreaterThanOrEqual(COURT.hoopBottomY - COURT.hoopScoreRadius);
    expect(visualYAtScore).toBeLessThanOrEqual(COURT.hoopBottomY + COURT.hoopScoreRadius);
    expect(game.state.phase).toBe('playing');
    expect(game.state.ball.y).toBeGreaterThan(COURT.halfwayY);
    expect(game.state.ball.flightLocked).toBe(false);
  });

  it('boosts a missed shot that clips the hoop rim', () => {
    const game = new GameSimulation(() => 0.2);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: COURT.centerX + 40, y: 519 });
    expect(game.release(0, 600)).toBe('shot');
    const launchSpeed = Math.hypot(ball.vx, ball.vy);

    for (let frame = 0; frame < 100 && ball.vy > 0; frame += 1) game.tick(1 / 60);

    expect(game.state.score.north).toBe(0);
    expect(ball.vy).toBeLessThan(0);
    expect(Math.hypot(ball.vx, ball.vy)).toBeGreaterThan(launchSpeed);
  });

  it('scores a north-bound shot when it passes the visible hoop plane', () => {
    const game = new GameSimulation(() => 0.8);
    const ball = game.state.ball;
    game.tryGrab({ x: ball.x, y: ball.y });
    game.moveHeldBall({ x: COURT.centerX, y: 481 });
    expect(game.release(0, -600)).toBe('shot');

    let visualYAtScore = Number.NaN;
    for (let frame = 0; frame < 150 && game.state.score.south === 0; frame += 1) {
      game.tick(1 / 60);
      if (game.state.score.south > 0) visualYAtScore = game.state.ball.y - game.state.ball.z;
    }

    expect(game.state.score.south).toBe(1);
    expect(visualYAtScore).toBeGreaterThanOrEqual(COURT.hoopTopY - COURT.hoopScoreRadius);
    expect(visualYAtScore).toBeLessThanOrEqual(COURT.hoopTopY + COURT.hoopScoreRadius);
  });

  it('ends the local match when either side reaches ten', () => {
    const game = new GameSimulation(() => 0.2);
    for (let point = 0; point < 20 && game.state.phase !== 'gameOver'; point += 1) {
      const side = sideAt(game.state.ball.y);
      const ball = game.state.ball;
      expect(game.tryGrab({ x: ball.x, y: ball.y })).toBe(true);
      game.moveHeldBall({ x: COURT.centerX, y: side === 'north' ? 519 : 481 });
      game.release(0, side === 'north' ? 600 : -600);
      for (let frame = 0; frame < 120; frame += 1) game.tick(1 / 60);
    }
    expect(Math.max(game.state.score.north, game.state.score.south)).toBe(10);
    expect(game.state.phase).toBe('gameOver');
    expect(game.state.winner).not.toBeNull();
  });

  it('keeps physics tuning mutable and independent per match', () => {
    const custom = { ...DEFAULT_TUNING };
    const game = new GameSimulation(() => 0.2, custom);
    game.updateTuning({ gravity: 700, shotPower: 1.2 });
    expect(game.tuning.gravity).toBe(700);
    expect(game.tuning.shotPower).toBe(1.2);
    expect(DEFAULT_TUNING.gravity).toBe(520);
  });
});
