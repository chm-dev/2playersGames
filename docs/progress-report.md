# Project Progress Report

**As of:** 2026-10-13  
**Plan:** [game-implementation-plan.md](game-implementation-plan.md)

## Summary

Phase 1 has a playable local browser implementation. Physics, court feel, and match flow can be exercised without a server or network connection. Phase 1 acceptance is still pending playtesting and tuning review; Phase 2 has not started.

## Phase 1: Local Game and Physics Tuning

### Implemented

- TypeScript, Vite, and Canvas application with a responsive portrait court, two hoops, score, ball and ground shadow; player avatars are not rendered.
- Local simulation using Matter.js for court-wall collisions and a separate vertical-height model for ball flight and ground bounces.
- Pointer-based ball pickup and hold in the ball's half, slow-release drop, and velocity-classified flick shots.
- Airborne pickup lock until the first ground impact, wall rebounds, hoop-entry scoring for the shooter, random opening side, 0.5-second score reset with the ball placed in the opponent's half, and first-to-10 match end.
- Live controls for gravity, flick threshold, shot power, and bounce, plus reset controls.
- Simulation regression tests for pickup eligibility, release classification, shot lockout, goal-lane rebounds, wall rebounds, shot scoring/reset, grounded-ball stability, and match end.

### Verification

- `npm.cmd test`: 12 tests passed.
- `npm.cmd run build`: TypeScript check and production build passed.
- `npm.cmd audit`: zero vulnerabilities.
- Browser checks: responsive desktop and mobile layouts; a fresh local touch/flick interaction scored and completed the post-score reset.

### Remaining Before Phase 1 Acceptance

- Playtest the physics and overall feel, especially the flick threshold, shot arc, bounce strength, and hoop difficulty; adjust the live sliders as needed.
- Confirm the chosen feel and rules before authorizing Phase 2. The local implementation and automated match test do not replace this subjective acceptance review.

## Phase 2: Server and Multiplayer

**Status: Not started by design.** Begin only after Phase 1 acceptance.

Planned work remains as specified in [game-implementation-plan.md](game-implementation-plan.md): add the Node.js WebSocket server and shared protocol, room pairing and player assignment, authoritative server simulation, synchronization and reconnect handling, PWA support, and two-session validation.

## Run Locally

```powershell
npm.cmd run dev -- --port 4173
```

Open <http://localhost:4173/>. Run tests with `npm.cmd test` and verify a production build with `npm.cmd run build`.
