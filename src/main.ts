import './styles.css';
import { COURT } from './game/constants';
import { GameSimulation } from './game/simulation';
import type { PhysicsTuning, Point } from './game/types';
import { renderCourt } from './render/court';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Game root element not found');

function required<T extends Element>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (!element) throw new Error(`Missing required element: ${selector}`);
	return element;
}

const canvas = required<HTMLCanvasElement>('#court');
const tuningOverlay = required<HTMLDivElement>('#tuning-overlay');
const settingsButton = required<HTMLButtonElement>('#open-settings');
const closeSettingsButton = required<HTMLButtonElement>('#close-settings');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is not available');

const simulation = new GameSimulation();
const northScore = required<HTMLElement>('#north-score');
const southScore = required<HTMLElement>('#south-score');
const matchState = required<HTMLElement>('#match-state');
const interactionHint = required<HTMLElement>('#interaction-hint');
const inputs = {
	gravity: required<HTMLInputElement>('#gravity'),
	flickThreshold: required<HTMLInputElement>('#flick-threshold'),
	shotPower: required<HTMLInputElement>('#shot-power'),
	bounce: required<HTMLInputElement>('#bounce'),
};
const outputs = {
	gravity: required<HTMLOutputElement>('#gravity-value'),
	flickThreshold: required<HTMLOutputElement>('#flick-threshold-value'),
	shotPower: required<HTMLOutputElement>('#shot-power-value'),
	bounce: required<HTMLOutputElement>('#bounce-value'),
};
const initialTuning: PhysicsTuning = { ...simulation.tuning };

let heldPointer: number | null = null;
let samples: Array<{ point: Point; time: number }> = [];
let previousFrame = performance.now();
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

function canvasPoint(event: PointerEvent): Point {
	const bounds = canvas.getBoundingClientRect();
	return {
		x: ((event.clientX - bounds.left) / bounds.width) * COURT.width,
		y: ((event.clientY - bounds.top) / bounds.height) * COURT.height,
	};
}

function resizeCanvas(): void {
	const bounds = canvas.getBoundingClientRect();
	pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
	canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
}

function updateScoreAndStatus(): void {
	const { score, phase, resetRemaining, winner, ball } = simulation.state;
	northScore.textContent = String(score.north);
	southScore.textContent = String(score.south);
	if (phase === 'gameOver') {
		matchState.textContent = `${winner?.toUpperCase()} WINS`;
		interactionHint.textContent = 'Start a new match to play again';
	} else if (phase === 'resetting') {
		matchState.textContent = `POINT · ${Math.max(0, resetRemaining).toFixed(1)}s`;
		interactionHint.textContent = `${simulation.state.lastScorer?.toUpperCase()} scored`;
	} else if (ball.mode === 'held') {
		matchState.textContent = `${ball.heldBy?.toUpperCase()} HAS THE BALL`;
		interactionHint.textContent = 'Flick in the direction you want to shoot';
	} else if (ball.flightLocked) {
		matchState.textContent = 'SHOT IN FLIGHT';
		interactionHint.textContent = 'Ball is live after its first ground hit';
	} else {
		matchState.textContent = 'LOCAL MATCH';
		interactionHint.textContent = `Ball in ${ball.y < COURT.halfwayY ? 'north' : 'south'} half · touch to pick up`;
	}
}

function frame(now: number): void {
	const elapsed = (now - previousFrame) / 1000;
	previousFrame = now;
	simulation.tick(elapsed);
	context!.setTransform(canvas.width / COURT.width, 0, 0, canvas.height / COURT.height, 0, 0);
	renderCourt(context!, simulation.state, now);
	updateScoreAndStatus();
	requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', (event) => {
	if (heldPointer !== null) return;
	const point = canvasPoint(event);
	if (!simulation.tryGrab(point)) return;
	event.preventDefault();
	heldPointer = event.pointerId;
	samples = [{ point, time: event.timeStamp }];
	canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
	if (event.pointerId !== heldPointer) return;
	event.preventDefault();
	const point = canvasPoint(event);
	simulation.moveHeldBall(point);
	samples.push({ point, time: event.timeStamp });
	const cutoff = event.timeStamp - 160;
	samples = samples.filter((sample) => sample.time >= cutoff);
});

function finishPointer(event: PointerEvent): void {
	if (event.pointerId !== heldPointer) return;
	const point = canvasPoint(event);
	samples.push({ point, time: event.timeStamp });
	const latest = samples[samples.length - 1];
	const earliest = samples.find((sample) => latest.time - sample.time >= 45) ?? samples[0];
	const duration = Math.max(0.04, (latest.time - earliest.time) / 1000);
	simulation.release((latest.point.x - earliest.point.x) / duration, (latest.point.y - earliest.point.y) / duration);
	heldPointer = null;
	samples = [];
	if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener('pointerup', finishPointer);
canvas.addEventListener('pointercancel', finishPointer);

required<HTMLButtonElement>('#new-game').addEventListener('click', () => simulation.newMatch());
required<HTMLButtonElement>('#mobile-new-game').addEventListener('click', () => {
	simulation.newMatch();
	closeSettings();
});

function closeSettings(): void {
	tuningOverlay.classList.remove('is-open');
	tuningOverlay.setAttribute('aria-hidden', 'true');
	settingsButton.setAttribute('aria-expanded', 'false');
	settingsButton.focus();
}

settingsButton.addEventListener('click', () => {
	tuningOverlay.classList.add('is-open');
	tuningOverlay.setAttribute('aria-hidden', 'false');
	settingsButton.setAttribute('aria-expanded', 'true');
	closeSettingsButton.focus();
});
closeSettingsButton.addEventListener('click', closeSettings);
tuningOverlay.addEventListener('click', (event) => {
	if (event.target === tuningOverlay) closeSettings();
});
window.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && tuningOverlay.classList.contains('is-open')) closeSettings();
});

required<HTMLButtonElement>('#reset-tuning').addEventListener('click', () => {
	for (const key of Object.keys(inputs) as Array<keyof PhysicsTuning>) {
		inputs[key].value = String(initialTuning[key]);
		outputs[key].value = key === 'bounce' || key === 'shotPower' ? initialTuning[key].toFixed(2).replace(/0$/, '') : String(initialTuning[key]);
	}
	simulation.updateTuning(initialTuning);
});

for (const key of Object.keys(inputs) as Array<keyof PhysicsTuning>) {
	inputs[key].addEventListener('input', () => {
		const value = Number(inputs[key].value);
		simulation.updateTuning({ [key]: value });
		outputs[key].value = key === 'bounce' || key === 'shotPower' ? value.toFixed(2).replace(/0$/, '') : String(value);
	});
}

window.addEventListener('keydown', (event) => {
	if (event.key.toLowerCase() !== 'r' || event.target instanceof HTMLInputElement) return;
	simulation.newMatch();
});

new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();
requestAnimationFrame(frame);
