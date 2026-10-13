import Matter from 'matter-js';
import { COURT, DEFAULT_TUNING, FIXED_STEP, RESET_SECONDS, WIN_SCORE } from './constants';
import type { BallState, MatchState, PhysicsTuning, Point, Side } from './types';

const { Bodies, Body, Composite, Engine } = Matter;
const MAX_SPEED = 980;
const MIN_SHOT_SPEED = 260;
const HELD_PICKUP_RADIUS = 35;
const MATTER_TICKS_PER_SECOND = 1 / FIXED_STEP;

function otherSide(side: Side): Side {
  return side === 'north' ? 'south' : 'north';
}

export function sideAt(y: number): Side {
  return y < COURT.halfwayY ? 'north' : 'south';
}

export function openingBallY(side: Side, fraction = 0.5): number {
  const inset = COURT.height * 0.12;
  return side === 'north'
    ? inset + fraction * (COURT.halfwayY - inset * 1.5)
    : COURT.halfwayY + inset * 0.5 + fraction * (COURT.halfwayY - inset * 1.5);
}

export function scoreAtGoal(
  x: number,
  visualY: number,
  height: number,
  verticalVelocity: number,
  shooter: Side | null,
  ballRadius = 0,
): Side | null {
  if (shooter === null || verticalVelocity >= 0) return null;
  if (height + ballRadius < COURT.hoopRimHeight || height - ballRadius > COURT.hoopMaxHeight) return null;

  const hoopY = shooter === 'north' ? COURT.hoopBottomY : COURT.hoopTopY;
  const distance = Math.hypot(x - COURT.centerX, visualY - hoopY);
  return distance <= COURT.hoopScoreRadius ? shooter : null;
}

function makeBall(x: number, y: number): BallState {
  return {
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    mode: 'free',
    flightLocked: false,
    landed: true,
    shooter: null,
    heldBy: null,
  };
}

export class GameSimulation {
  readonly state: MatchState;
  readonly tuning: PhysicsTuning;
  private readonly engine: Matter.Engine;
  private readonly ballBody: Matter.Body;
  private accumulator = 0;
  private random: () => number;

  constructor(random: () => number = Math.random, tuning: PhysicsTuning = { ...DEFAULT_TUNING }) {
    this.random = random;
    this.tuning = { ...tuning };
    this.engine = Engine.create({ enableSleeping: false });
    this.engine.gravity.scale = 0;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 6;
    this.addCourtWalls();
    this.ballBody = Bodies.circle(COURT.centerX, COURT.halfwayY, COURT.ballRadius, {
      restitution: COURT.wallBounce,
      friction: 0,
      frictionAir: 0.001,
      slop: 0,
      label: 'ball',
    });
    Composite.add(this.engine.world, this.ballBody);
    this.state = {
      score: { north: 0, south: 0 },
      phase: 'playing',
      resetRemaining: 0,
      winner: null,
      lastScorer: null,
      message: 'Touch the ball to begin',
      ball: makeBall(COURT.centerX, COURT.halfwayY),
    };
    this.newMatch(false);
  }

  newMatch(announce = true): void {
    this.state.score.north = 0;
    this.state.score.south = 0;
    this.state.phase = 'playing';
    this.state.resetRemaining = 0;
    this.state.winner = null;
    this.state.lastScorer = null;
    this.state.message = announce ? 'New match · touch the ball' : 'Touch the ball to begin';
    const side: Side = this.random() < 0.5 ? 'north' : 'south';
    const fraction = 0.28 + this.random() * 0.44;
    this.placeBall(COURT.centerX + (this.random() - 0.5) * 70, openingBallY(side, fraction));
  }

  updateTuning(values: Partial<PhysicsTuning>): void {
    Object.assign(this.tuning, values);
  }

  tryGrab(point: Point): boolean {
    const { ball } = this.state;
    if (this.state.phase !== 'playing' || ball.mode === 'held' || ball.flightLocked) return false;
    const projectedY = ball.y - ball.z;
    const visualRadius = COURT.ballRadius + Math.min(ball.z * 0.035, 12);
    const inside = Math.hypot(point.x - ball.x, point.y - projectedY) <= visualRadius + HELD_PICKUP_RADIUS * 0.25;
    if (!inside || sideAt(ball.y) !== sideAt(point.y)) return false;

    ball.mode = 'held';
    ball.heldBy = sideAt(ball.y);
    ball.shooter = null;
    ball.flightLocked = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.z = 0;
    Body.setPosition(this.ballBody, { x: ball.x, y: ball.y });
    Body.setVelocity(this.ballBody, { x: 0, y: 0 });
    this.state.message = `${ball.heldBy.toUpperCase()} · flick to shoot`;
    return true;
  }

  moveHeldBall(point: Point): void {
    const { ball } = this.state;
    if (ball.mode !== 'held' || this.state.phase !== 'playing') return;
    ball.x = Math.max(COURT.ballRadius + 8, Math.min(COURT.width - COURT.ballRadius - 8, point.x));
    ball.y = Math.max(COURT.ballRadius + 12, Math.min(COURT.height - COURT.ballRadius - 12, point.y));
    ball.z = 0;
    ball.vx = 0;
    ball.vy = 0;
    Body.setPosition(this.ballBody, { x: ball.x, y: ball.y });
    Body.setVelocity(this.ballBody, { x: 0, y: 0 });
  }

  release(velocityX: number, velocityY: number): 'drop' | 'shot' | 'none' {
    const { ball } = this.state;
    if (ball.mode !== 'held' || this.state.phase !== 'playing') return 'none';
    const holder = ball.heldBy ?? sideAt(ball.y);
    const speed = Math.hypot(velocityX, velocityY);
    ball.mode = 'free';
    ball.heldBy = null;
    ball.landed = false;
    ball.vx = 0;
    ball.vy = 0;
    Body.setVelocity(this.ballBody, { x: 0, y: 0 });

    if (speed < this.tuning.flickThreshold) {
      ball.flightLocked = false;
      ball.shooter = null;
      ball.vz = 128;
      this.state.message = 'Soft drop · ball is live';
      return 'drop';
    }

    const launchSpeed = Math.max(MIN_SHOT_SPEED, Math.min(MAX_SPEED, speed * 0.68 * this.tuning.shotPower));
    ball.vx = (velocityX / speed) * launchSpeed;
    ball.vy = (velocityY / speed) * launchSpeed;
    ball.vz = 245 + launchSpeed * 0.18;
    ball.shooter = holder;
    ball.flightLocked = true;
    this.state.message = `${holder.toUpperCase()} · shot away`;
    Body.setVelocity(this.ballBody, { x: ball.vx / MATTER_TICKS_PER_SECOND, y: ball.vy / MATTER_TICKS_PER_SECOND });
    return 'shot';
  }

  tick(elapsedSeconds: number): void {
    const safeElapsed = Math.max(0, Math.min(elapsedSeconds, 0.12));
    this.accumulator += safeElapsed;
    while (this.accumulator >= FIXED_STEP) {
      this.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
  }

  private step(dt: number): void {
    if (this.state.phase === 'resetting') {
      this.state.resetRemaining -= dt;
      if (this.state.resetRemaining <= 0) {
        const scoredBy = this.state.lastScorer ?? 'north';
        this.placeBall(COURT.centerX, openingBallY(otherSide(scoredBy), 0.5));
        this.state.phase = 'playing';
        this.state.message = `${otherSide(scoredBy).toUpperCase()} · ball ready`;
      }
      return;
    }
    if (this.state.phase !== 'playing' || this.state.ball.mode === 'held') return;

    const ball = this.state.ball;
    const previousY = ball.y;
    const previousZ = ball.z;
    const previousVisualY = previousY - previousZ;
    const previousVisualRadius = COURT.ballRadius + Math.min(previousZ * 0.035, 12);
    Engine.update(this.engine, dt * 1000);
    const position = this.ballBody.position;
    ball.x = position.x;
    ball.y = position.y;
    ball.vx = this.ballBody.velocity.x * MATTER_TICKS_PER_SECOND;
    ball.vy = this.ballBody.velocity.y * MATTER_TICKS_PER_SECOND;

    ball.vz -= this.tuning.gravity * dt;
    ball.z += ball.vz * dt;
    if (ball.z <= 0 && previousZ > 0) {
      ball.z = 0;
      if (!ball.landed) {
        if (ball.flightLocked) {
          ball.flightLocked = false;
          this.state.message = `${sideAt(ball.y).toUpperCase()} · ball is live`;
        }
        ball.landed = true;
      }
      ball.vz = Math.abs(ball.vz) * this.tuning.bounce;
      if (ball.vz < 42) ball.vz = 0;
      Body.setVelocity(this.ballBody, { x: (ball.vx * 0.94) / MATTER_TICKS_PER_SECOND, y: (ball.vy * 0.94) / MATTER_TICKS_PER_SECOND });
      ball.vx = this.ballBody.velocity.x * MATTER_TICKS_PER_SECOND;
      ball.vy = this.ballBody.velocity.y * MATTER_TICKS_PER_SECOND;
    } else if (ball.z <= 0 && ball.vz <= 0) {
      ball.z = 0;
      ball.vz = 0;
    }

    const visualY = ball.y - ball.z;
    const visualRadius = COURT.ballRadius + Math.min(ball.z * 0.035, 12);
    const scorer = ball.flightLocked
      ? scoreAtGoal(ball.x, visualY, ball.z, ball.vz, ball.shooter, visualRadius)
      : null;
    if (scorer) {
      this.awardPoint(scorer);
      return;
    }

    this.bounceFromGoalLine(previousVisualY);
    this.bounceFromEndWall(previousVisualY, previousVisualRadius);
    if (ball.z === 0 && Math.abs(ball.vx) + Math.abs(ball.vy) < 5) {
      ball.vx = 0;
      ball.vy = 0;
      Body.setVelocity(this.ballBody, { x: 0, y: 0 });
    }
  }

  private bounceFromGoalLine(previousVisualY: number): void {
    const ball = this.state.ball;
    const visualY = ball.y - ball.z;
    const visualRadius = COURT.ballRadius + Math.min(ball.z * 0.035, 12);
    const crossedTop = previousVisualY > COURT.hoopTopY && visualY <= COURT.hoopTopY;
    const crossedBottom = previousVisualY < COURT.hoopBottomY && visualY >= COURT.hoopBottomY;
    if (!crossedTop && !crossedBottom) return;
    if (this.isRimImpact(visualY, visualRadius)) {
      const hoopY = crossedTop ? COURT.hoopTopY : COURT.hoopBottomY;
      ball.y = hoopY + ball.z + (crossedTop ? 1 : -1);
      ball.vx = -ball.vx * COURT.rimBounce;
      ball.vy = -ball.vy * COURT.rimBounce;
      Body.setPosition(this.ballBody, { x: ball.x, y: ball.y });
      Body.setVelocity(this.ballBody, { x: ball.vx / MATTER_TICKS_PER_SECOND, y: ball.vy / MATTER_TICKS_PER_SECOND });
      return;
    }
    const hoopLane = Math.abs(ball.x - COURT.centerX) <= COURT.hoopGap / 2 - COURT.ballRadius * 0.5;
    if (hoopLane) {
      const safeY = crossedTop ? COURT.hoopTopY + ball.z + 1 : COURT.hoopBottomY + ball.z - 1;
      ball.y = safeY;
      ball.vy = -ball.vy * COURT.wallBounce;
      Body.setPosition(this.ballBody, { x: ball.x, y: safeY });
      Body.setVelocity(this.ballBody, { x: ball.vx / MATTER_TICKS_PER_SECOND, y: ball.vy / MATTER_TICKS_PER_SECOND });
    }
  }

  private bounceFromEndWall(
    previousVisualY: number,
    previousVisualRadius: number,
  ): void {
    const ball = this.state.ball;
    const visualY = ball.y - ball.z;
    const visualRadius = COURT.ballRadius + Math.min(ball.z * 0.035, 12);
    const segmentWidth = (COURT.width - COURT.hoopGap) / 2;
    const touchesEndSegment = ball.x - visualRadius < segmentWidth
      || ball.x + visualRadius > COURT.width - segmentWidth;
    if (!touchesEndSegment) return;

    const northEdge = COURT.wallThickness / 2;
    const southEdge = COURT.height - northEdge;
    const crossedNorth = previousVisualY - previousVisualRadius >= northEdge
      && visualY - visualRadius < northEdge;
    const crossedSouth = previousVisualY + previousVisualRadius <= southEdge
      && visualY + visualRadius > southEdge;
    const rimImpact = this.isRimImpact(visualY, visualRadius);
    if (crossedNorth && ball.vy < 0) {
      ball.y = northEdge + visualRadius + ball.z;
      ball.vy = Math.abs(ball.vy) * (rimImpact ? COURT.rimBounce : COURT.wallBounce);
    } else if (crossedSouth && ball.vy > 0) {
      ball.y = southEdge - visualRadius + ball.z;
      ball.vy = -Math.abs(ball.vy) * (rimImpact ? COURT.rimBounce : COURT.wallBounce);
    } else {
      return;
    }
    if (rimImpact) ball.vx = -ball.vx * COURT.rimBounce;
    Body.setPosition(this.ballBody, { x: ball.x, y: ball.y });
    Body.setVelocity(this.ballBody, { x: ball.vx / MATTER_TICKS_PER_SECOND, y: ball.vy / MATTER_TICKS_PER_SECOND });
  }

  private isRimImpact(visualY: number, visualRadius: number): boolean {
    const ball = this.state.ball;
    const lateralOffset = Math.abs(ball.x - COURT.centerX);
    if (!ball.flightLocked || lateralOffset <= COURT.hoopScoreRadius) return false;

    const topDistance = Math.hypot(lateralOffset, visualY - COURT.hoopTopY);
    const bottomDistance = Math.hypot(lateralOffset, visualY - COURT.hoopBottomY);
    const contactDistance = visualRadius + 4;
    return Math.abs(topDistance - COURT.hoopRimRadius) <= contactDistance
      || Math.abs(bottomDistance - COURT.hoopRimRadius) <= contactDistance;
  }

  private awardPoint(side: Side): void {
    const ball = this.state.ball;
    this.state.score[side] += 1;
    this.state.lastScorer = side;
    ball.mode = 'free';
    ball.heldBy = null;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.flightLocked = false;
    ball.shooter = null;
    Body.setVelocity(this.ballBody, { x: 0, y: 0 });

    if (this.state.score[side] >= WIN_SCORE) {
      this.state.winner = side;
      this.state.phase = 'gameOver';
      this.state.message = `${side.toUpperCase()} WINS`;
      return;
    }

    this.state.phase = 'resetting';
    this.state.resetRemaining = RESET_SECONDS;
    this.state.message = `${side.toUpperCase()} SCORES`;
  }

  private placeBall(x: number, y: number): void {
    const ball = makeBall(x, y);
    this.state.ball = ball;
    Body.setPosition(this.ballBody, { x, y });
    Body.setVelocity(this.ballBody, { x: 0, y: 0 });
    Body.setAngle(this.ballBody, 0);
    Body.setAngularVelocity(this.ballBody, 0);
    this.accumulator = 0;
  }

  private addCourtWalls(): void {
    const wall = COURT.wallThickness;
    const sideWalls = [
      Bodies.rectangle(-wall / 2, COURT.height / 2, wall, COURT.height + wall * 2, { isStatic: true, restitution: COURT.wallBounce, friction: 0 }),
      Bodies.rectangle(COURT.width + wall / 2, COURT.height / 2, wall, COURT.height + wall * 2, { isStatic: true, restitution: COURT.wallBounce, friction: 0 }),
    ];
    Composite.add(this.engine.world, sideWalls);
  }
}
