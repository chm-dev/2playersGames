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
    expect(scoreAtGoal(940, 960, COURT.centerX, 60, 'north')).toBe('north');
    expect(scoreAtGoal(60, 40, COURT.centerX, 60, 'south')).toBe('south');
    expect(scoreAtGoal(940, 960, 80, 60, 'north')).toBeNull();
    expect(scoreAtGoal(940, 960, COURT.centerX, 12, 'north')).toBeNull();
    expect(scoreAtGoal(940, 960, COURT.centerX, 60, 'south')).toBeNull();
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
    expect(game.release(0, 900)).toBe('shot');
    for (let index = 0; index < 140; index += 1) game.tick(1 / 60);
    expect(game.state.score.north).toBe(1);
    expect(game.state.phase).toBe('playing');
    expect(game.state.ball.y).toBeGreaterThan(COURT.halfwayY);
    expect(game.state.ball.flightLocked).toBe(false);
  });

  it('ends the local match when either side reaches ten', () => {
    const game = new GameSimulation(() => 0.2);
    for (let point = 0; point < 20 && game.state.phase !== 'gameOver'; point += 1) {
      const side = sideAt(game.state.ball.y);
      const ball = game.state.ball;
      expect(game.tryGrab({ x: ball.x, y: ball.y })).toBe(true);
      game.release(0, side === 'north' ? 900 : -900);
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
