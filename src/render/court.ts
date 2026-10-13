import { COURT } from '../game/constants';
import type { BallState, MatchState, Side } from '../game/types';

const COURT_EDGE = 18;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCourtMarkings(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(248, 249, 244, .92)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(COURT_EDGE, COURT.halfwayY);
  ctx.lineTo(COURT.width - COURT_EDGE, COURT.halfwayY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, COURT.halfwayY, 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(248, 249, 237, .82)';
  ctx.fill();
  ctx.restore();
}

function drawHoop(ctx: CanvasRenderingContext2D, side: Side): void {
  const y = side === 'north' ? COURT.hoopTopY : COURT.hoopBottomY;
  const backboardY = side === 'north' ? y - 20 : y + 20;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(247, 248, 235, .9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(COURT.centerX - 46, backboardY);
  ctx.lineTo(COURT.centerX + 46, backboardY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(246, 201, 100, .95)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(COURT.centerX, y, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 250, 232, .6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(COURT.centerX, y, 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: BallState, now: number): void {
  const radius = COURT.ballRadius + Math.min(ball.z * 0.035, 12);
  const shadowScale = Math.max(0.48, 1 - ball.z * 0.0024);
  const visualY = ball.y - ball.z;

  ctx.save();
  ctx.fillStyle = `rgba(23, 39, 31, ${Math.max(0.07, 0.24 - ball.z * 0.0011)})`;
  ctx.beginPath();
  ctx.ellipse(ball.x + 3, ball.y + 8, radius * shadowScale * 1.14, radius * shadowScale * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (ball.mode === 'held') {
    const pulse = 2 + Math.sin(now / 150) * 1.3;
    ctx.beginPath();
    ctx.arc(ball.x, visualY, radius + 8 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 247, 220, .9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(ball.x, visualY);
  ctx.rotate(ball.x * 0.005 + now / 1600);
  const gradient = ctx.createRadialGradient(-radius * 0.34, -radius * 0.4, 2, 0, 0, radius * 1.12);
  gradient.addColorStop(0, '#ffbd75');
  gradient.addColorStop(0.55, '#ed8250');
  gradient.addColorStop(1, '#c8533d');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#573c30';
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(82, 50, 38, .84)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.93, 0);
  ctx.quadraticCurveTo(0, -radius * 0.33, radius * 0.93, 0);
  ctx.moveTo(-radius * 0.93, 0);
  ctx.quadraticCurveTo(0, radius * 0.33, radius * 0.93, 0);
  ctx.moveTo(0, -radius * 0.96);
  ctx.bezierCurveTo(-radius * 0.2, -radius * 0.2, -radius * 0.2, radius * 0.2, 0, radius * 0.96);
  ctx.moveTo(0, -radius * 0.96);
  ctx.bezierCurveTo(radius * 0.2, -radius * 0.2, radius * 0.2, radius * 0.2, 0, radius * 0.96);
  ctx.stroke();
  ctx.restore();
}

export function renderCourt(ctx: CanvasRenderingContext2D, state: MatchState, now: number): void {
  ctx.fillStyle = '#204568';
  ctx.fillRect(0, 0, COURT.width, COURT.height);

  ctx.save();
  roundRectPath(ctx, COURT_EDGE, COURT_EDGE, COURT.width - COURT_EDGE * 2, COURT.height - COURT_EDGE * 2, 15);
  ctx.clip();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, COURT_EDGE, COURT_EDGE, COURT.width - COURT_EDGE * 2, COURT.height - COURT_EDGE * 2, 15);
  ctx.strokeStyle = 'rgba(248, 249, 244, .78)';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCourtMarkings(ctx);
  ctx.restore();

  drawHoop(ctx, 'north');
  drawHoop(ctx, 'south');

  ctx.save();
  if (state.phase === 'resetting') {
    const alpha = 0.24 + Math.sin(now / 45) * 0.035;
    ctx.fillStyle = `rgba(28, 46, 38, ${alpha})`;
    ctx.fillRect(0, 0, COURT.width, COURT.height);
    drawStatusBadge(ctx, 'POINT', state.lastScorer ?? 'north');
  } else if (state.phase === 'gameOver') {
    ctx.fillStyle = 'rgba(28, 46, 38, .52)';
    ctx.fillRect(0, 0, COURT.width, COURT.height);
    drawStatusBadge(ctx, 'WINNER', state.winner ?? 'north');
  }

  if (state.phase !== 'gameOver') drawBall(ctx, state.ball, now);
}

function drawStatusBadge(ctx: CanvasRenderingContext2D, label: string, side: Side): void {
  ctx.save();
  const centerY = COURT.halfwayY;
  ctx.fillStyle = '#f5f4ec';
  roundRectPath(ctx, 180, centerY - 51, 240, 102, 5);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7f8a80';
  ctx.font = '800 11px "DM Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(label, COURT.centerX, centerY - 13);
  ctx.fillStyle = side === 'north' ? '#d96d50' : '#3b8993';
  ctx.font = '700 34px "Barlow Condensed", sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(side.toUpperCase(), COURT.centerX, centerY + 28);
  ctx.restore();
}
