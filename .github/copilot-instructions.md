# Project Instructions

Game specification: `docs/game-description.md`. Progress notes: `docs/progress-report.md`. Visual context: `images/` (not pixel-perfect).

## Game Implementation Plan

### Goal

Build the core game first as a local browser experience so its physics and feel can be tested and tuned before any multiplayer work. Once Phase 1 is complete and accepted, move the simulation to an authoritative server and add simultaneous online play.

### Phase 1: Local Game and Physics Tuning (current scope)

Must be playable in one browser without a server, network connection, room system, or remote player. Both sides of the court are played locally on the same device.

#### Implementation Steps

1. Scaffold a TypeScript browser client with Canvas rendering, touch/mouse input, local simulation, and a simple local development server.
2. Render a responsive portrait court with two hoops, a halfway line, score, exit/restart controls, ball, and a shadow/ground-position cue. Do not render player avatars.
3. Implement touch-to-hold on a free, pickup-ready ball only in the active side's half. While held, the ball follows the pointer.
4. On release, a slow gesture drops the ball with a small bounce; a fast directional flick launches a shot. Make gesture threshold, gravity, launch scaling, ball bounce, and related feel parameters easy to tune.
5. Implement court-wall rebounds and a separate height/vertical-motion simulation for shot arcs and ground bounces. The ball is unavailable to either side until its first ground impact; after landing it can be picked up in whichever half contains it, including during later rebounds.
6. Detect valid passage through the opponent's hoop and award one point to the shooter exactly once per shot.
7. Start with the pickup-ready ball in a randomly selected half. After a score, pause 0.5 seconds and place a pickup-ready ball in the scorer's opponent's half. End the match at 10 points.
8. Add a small tuning panel or similarly direct controls for important physics values, with reset to defaults, so playtesting can iterate without code edits. Keep tuned values centralized for transfer to Phase 2.

#### Phase 1 Acceptance Gate

- Play the entire match loop locally from opening possession through scoring, reset, and a 10-point win.
- Verify touch and mouse support grab, hold, slow drop, and fast flick.
- Confirm ball trajectories, wall rebounds, bounce behavior, hoop scoring, and height visuals are understandable and tunable.
- Run without networking or multiplayer infrastructure.
- Review and tune physics and general feel before Phase 2. Do not start Phase 2 until this gate is accepted.

### Phase 2: Server and Multiplayer (After Phase 1 Acceptance)

1. Add a Node.js WebSocket server and shared typed protocol/rules package.
2. Add room creation/joining, player-half assignment, disconnect/reconnect handling, and PWA support.
3. Move possession, simulation, scoring, and match state to the server as the authoritative source. Reuse Phase 1's tested physics and rules rather than retuning behavior during migration.
4. Synchronize snapshots/events to both browser sessions; clients may interpolate visuals but must not decide possession or scores.
5. Test a two-session match, reconnect behavior, state synchronization, and production builds.

### Phase 1 Technology and Layout

Use TypeScript, Vite, and Canvas with a local deterministic game loop. Keep simulation, rendering, input, and tuning constants in separate modules so the simulation can be reused by the Phase 2 server. Do not add server or WebSocket dependencies in Phase 1.

```text
src/
   game/       Local match state, ball simulation, and rules
   render/     Canvas court, hoops, ball, and score
   input/      Pointer capture and flick gesture sampling
   tuning/     Physics defaults and local tuning controls
docs/
  game-description.md
  game-implementation-plan.md
```

### Rules to Preserve in Both Phases

- No player avatars are visible; the ball is the direct touch target.
- Slow release drops the held ball with a slight bounce; a fast directional flick throws it.
- Neither player can grab a thrown ball before its first ground impact. After impact, pickup is allowed in the half containing the ball, including during later rebounds.
- Balls rebound from court walls.
- A valid passage through the opponent's hoop awards one point to the shooter.
- Opening ball placement is random. After a score, wait 0.5 seconds and place a pickup-ready ball in the opponent's half.
- First to 10 points wins.

### Validation

Phase 1:
- Test legal and illegal grabs, held-ball pointer following, slow release versus fast flick, angle/strength response, wall rebounds, first-landing lockout, post-impact pickup, hoop scoring once, scorer credit, random opening half, score reset, and first-to-10 end state.
- Typecheck and build the client; play through a local match at desktop and mobile viewport sizes.
- Use local tuning controls and repeated playtests to settle flight, bounce, and gesture feel before Phase 1 acceptance.

Phase 2:
- Test synchronization and authoritative decisions across two browser sessions, including reconnect and match-end behavior.
- Run client/server tests, typechecks, and production builds.
