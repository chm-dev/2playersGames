# Game Description

## Overview

A fast, head-to-head basketball game for two players. Phase 1 is a local, mobile-friendly browser game used to build and tune the gameplay, physics, and overall feel before networking is introduced. Phase 2 adds simultaneous play from separate browser sessions, coordinated by a real-time server. Node.js is the preferred server technology for Phase 2.

The court is presented in 2D, with no visible player avatars. The ball uses a flight simulation to suggest height and depth, giving shots and bounces a more physical feel without making the game 3D.

## Rules

1. The court is divided into two halves, with one half belonging to each player. Each player has a hoop at their end of the court. Players are not shown on the court; play is controlled directly through the ball.
2. A player may grab a free, pickup-ready ball by touching it, but only while it is in that player's own half. While held, the ball follows the controlling finger.
3. Releasing the ball without a fast flick drops it, producing a small bounce. A fast directional flick throws the ball toward the opponent's hoop. Flick direction and speed determine the shot's angle and strength, so scoring takes practice and a well-judged throw. The physics should feel precise and rewarding, but not excessively difficult.
4. Neither player may grab a thrown ball before it first hits the ground. After that landing, it is free and either player may try to grab it, but only while it is in their own half. Subsequent ground bounces do not prevent a grab.
5. The ball bounces off the court walls.
6. A shot scores when it passes through the opponent's hoop. The player who threw the shot earns one point.
7. At the start of a match, place the pickup-ready ball in a randomly selected player's half.
8. After a point, pause play for half a second, then place a pickup-ready ball in the scoring player's opponent's half.
9. The first player to reach 10 points wins.

## Ball Flight and Visuals

The ball remains a 2D object, while its apparent size communicates its simulated height: it grows as it rises after a shot and shrinks as it descends toward the ground. After a bounce, it should similarly appear smaller as it falls back toward the court. A shadow or equivalent cue should make the ball's ground position legible. The flight and bounce should make the ball's arc and landing feel natural, including a slight bounce when a held ball is released without a flick.

## Development Phases

### Phase 1: Local Game and Physics Tuning

The complete core game runs locally in one browser with no server, network connection, rooms, or remote players. Both halves can be played on the same device so the full possession, shooting, scoring, and reset loop can be tested. Prioritize tuning the flick response, flight arc, ball scale and shadow, wall rebounds, ground bounces, hoop detection, and overall feel. Keep the simulation structured so it can move to the server in Phase 2.

### Phase 2: Multiplayer

After Phase 1 gameplay and physics are tested and accepted, support simultaneous play from separate browser sessions. A real-time server coordinates ball possession, touch and flick inputs, ball movement, wall and ground bounces, scoring, the post-score reset, and match state so both views stay synchronized. The server determines valid grabs, scores, and the winner.