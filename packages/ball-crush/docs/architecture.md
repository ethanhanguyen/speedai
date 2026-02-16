# Architecture

## Overview

Ball Crush is a match-3 puzzle game built on `@speedai/game-engine`. Unlike Flappy Bird (which is ECS-heavy), Ball Crush uses a **hybrid approach**: a pure-data Grid model drives game logic, while the ECS layer handles rendering and animation only.

## High-Level Diagram

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   UnifiedInput  │────▶│  GameplayScene │────▶│  Grid (Model)  │
│  (pointer/tap)  │     │  State Machine │     │  9×9 cell array│
└─────────────┘     └──────┬───────┘     └───────┬────────┘
                           │                      │
                    ┌──────▼───────┐     ┌───────▼────────┐
                    │ AnimationMgr │     │ MatchDetector   │
                    │ (TweenSystem)│     │ SpecialResolver │
                    └──────┬───────┘     └────────────────┘
                           │
                    ┌──────▼───────┐
                    │ BallRenderer │
                    │ (Canvas 2D)  │
                    └──────────────┘
```

## Grid Model (non-ECS)

The `Grid` class (`src/grid/Grid.ts`) owns a 9×9 2D array of `Cell` objects. All game logic operates on this array:

- **Match detection** scans for 3+ lines in 8 directions
- **Gravity** compacts columns downward
- **Refill** generates new random balls from the top
- **Valid move checking** tries all adjacent swaps to detect deadlocks

The grid stores `entityId` references so it can coordinate with the ECS layer, but the grid itself contains no rendering logic.

## State Machine

`GameplayScene.update()` runs a frame-by-frame state machine:

```
IDLE → SWAPPING → MATCH_CHECK → CLEARING → FALLING → REFILLING → RECHECK
  ▲                                                                  │
  └──────────────────────── (no more matches) ◀──────────────────────┘
```

| State | What happens |
|-------|-------------|
| `IDLE` | Accepts pointer input. Player selects and swaps balls. |
| `SWAPPING` | AnimationManager tweens two balls' positions. On complete, checks for matches or swaps back. |
| `MATCH_CHECK` | Runs `detectMatches()`. If found, transitions to CLEARING. If none, ends cascade. |
| `CLEARING` | Resolves specials, emits particles, tweens clear animations (scale → 0). |
| `FALLING` | Compacts grid columns. Tweens falling balls to new positions. |
| `REFILLING` | Spawns new balls at top, tweens them dropping in. |
| `RECHECK` | Increments cascade multiplier, loops back to MATCH_CHECK. |

Input is locked during all non-IDLE states.

## Entity Usage

Entities are lightweight — each ball has 3 components:

| Component | Data |
|-----------|------|
| `Position` | `{ x, y }` — screen pixel coordinates |
| `Sprite` | `{ scaleX, scaleY, alpha, ... }` — used for tween animations |
| `BallData` | `{ color, special, gridRow, gridCol }` — links to grid model |

Entities are created/destroyed as balls appear/clear. The `entityMap[row][col]` array maps grid positions to entity IDs.

## Rendering

All rendering is procedural (no sprite assets):

- **BallRenderer** draws gradient circles with radial highlights per color
- Special overlays (stripes, bomb ring, rainbow arc) are drawn on top
- Grid cells are rounded rectangles with subtle fill
- UI (score, moves, progress bar) renders directly via Canvas 2D context
