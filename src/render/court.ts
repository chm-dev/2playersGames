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
  ctx.strokeStyle = 'rgba(244, 247, 235, 0.7)';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(COURT_EDGE, COURT.halfwayY);
  ctx.lineTo(COURT.width - COURT_EDGE, COURT.halfwayY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, COURT.halfwayY, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, COURT.halfwayY, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(248, 249, 237, .82)';
  ctx.fill();

  const keyWidth = 218;
  const keyDepth = 150;
  const topKeyY = COURT_EDGE;
  const bottomKeyY = COURT.height - COURT_EDGE - keyDepth;
  ctx.strokeRect(COURT.centerX - keyWidth / 2, topKeyY, keyWidth, keyDepth);
  ctx.strokeRect(COURT.centerX - keyWidth / 2, bottomKeyY, keyWidth, keyDepth);
  ctx.beginPath();
  ctx.arc(COURT.centerX, topKeyY + keyDepth, 69, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, bottomKeyY, 69, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, COURT.hoopTopY, 180, 0.12, Math.PI - 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(COURT.centerX, COURT.hoopBottomY, 180, Math.PI + 0.12, Math.PI * 2 - 0.12);
  ctx.stroke();
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
  ctx.moveTo(COURT.centerX - 37, backboardY);
  ctx.lineTo(COURT.centerX + 37, backboardY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(246, 201, 100, .95)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(COURT.centerX, y, 43, 13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 250, 232, .6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(COURT.centerX, y, 29, 8, 0, 0, Math.PI * 2);
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
  const background = ctx.createLinearGradient(0, 0, COURT.width, COURT.height);
  background.addColorStop(0, '#4e8c74');
  background.addColorStop(0.48, '#3f8068');
  background.addColorStop(1, '#34735f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, COURT.width, COURT.height);

  ctx.save();
  roundRectPath(ctx, COURT_EDGE, COURT_EDGE, COURT.width - COURT_EDGE * 2, COURT.height - COURT_EDGE * 2, 15);
  ctx.clip();
  ctx.fillStyle = 'rgba(244, 206, 115, .095)';
  ctx.fillRect(COURT_EDGE, COURT_EDGE, COURT.width - COURT_EDGE * 2, COURT.halfwayY - COURT_EDGE);
  ctx.fillStyle = 'rgba(118, 202, 210, .085)';
  ctx.fillRect(COURT_EDGE, COURT.halfwayY, COURT.width - COURT_EDGE * 2, COURT.height / 2 - COURT_EDGE);
  ctx.strokeStyle = 'rgba(246, 248, 238, .16)';
  ctx.lineWidth = 1;
  for (let x = 44; x < COURT.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, COURT_EDGE);
    ctx.lineTo(x, COURT.height - COURT_EDGE);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, COURT_EDGE, COURT_EDGE, COURT.width - COURT_EDGE * 2, COURT.height - COURT_EDGE * 2, 15);
  ctx.strokeStyle = 'rgba(247, 249, 237, .85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawCourtMarkings(ctx);
  ctx.restore();

  drawHoop(ctx, 'north');
  drawHoop(ctx, 'south');

  ctx.save();
  ctx.font = '700 13px "DM Sans", sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(249, 250, 235, .75)';
  ctx.fillText('NORTH', 37, 56);
  ctx.textAlign = 'right';
  ctx.fillText('SOUTH', COURT.width - 37, COURT.height - 36);
  ctx.restore();

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
