# Ball Crush — AI Development Guide

## Game Overview
Match-3 puzzle game with cascading combos, special balls, and juice-heavy game feel.

## Architecture

### Scene Structure
- **MenuScene** — Level selection
- **GameplayScene** — Main game loop (orchestrator)
- **LevelCompleteScene** — Victory screen
- **GameOverScene** — Defeat screen

### GameplayScene Modules (post-refactor)
- **GameplayInputHandler** — Input → action intents
- **GameplayStateMachine** — State transitions + cascade logic
- **GameplayRenderer** — All draw calls
- GameplayScene orchestrates these + entity/animation management

### State Machine States
`ENTRANCE | IDLE | SWAPPING | MATCH_CHECK | CLEARING | FALLING | REFILLING | RECHECK`

## Configuration Files (No Magic Numbers!)

All tunable constants live in `/src/config/`:

- **GameplayConfig.ts** — Scoring, cascade multipliers, dampening, combo thresholds
- **VisualConfig.ts** — Ball rendering, effects, particles, shake, flash, border glow, idle animations (B6), last-move vignette (B5)
- **AnimationConfig.ts** — Tween durations, bounce physics, shuffle animation (B7)
- **LayoutConfig.ts** — Canvas dimensions, grid layout
- **HintConfig.ts** — Hint timing (5s subtle, 10s strong), arrow visuals
- **ScorePopupConfig.ts** — Floating text font size, speed, fade duration
- **CellTypes.ts** — Data-driven obstacle type registry (see Obstacle System below)
- **ObjectiveConfig.ts** — Objective panel UI layout, `getObjectiveDisplay(id)` helper

## Event-Driven Architecture

GameplayScene subscribes to EventBus events fired by GameplayStateMachine:

- `match` — Screen shake + flash (big matches)
- `match_scored` — Spawns floating score popup (per match)
- `cascade` — Toast + combo escalation effects (2x/3x/5x)
- `cascade_end` — Resets combo glow
- `special` — Special activation shake + flash
- `special_destroy` — Particle bursts
- `ball_suck` / `ball_clear` — Particle effects
- `reshuffle` — No valid moves toast
- `obstacle_hit` — Obstacle damaged but survived (shake + particles)
- `obstacle_destroyed` — Obstacle removed (bigger shake + particles)

## Key Systems

### Hint System (B2)
- **Idle Timer**: Tracks time without input in IDLE state
- **Thresholds**:
  - 5s → Subtle pulse on valid move cells (intensity 0.5)
  - 10s → Strong pulse + curved arrow between cells (intensity 1.0)
- **Reset**: Any input clears hint and resets timer
- **Implementation**:
  - `Grid.findValidMove()` — Returns {r1,c1,r2,c2} or null
  - `AnimationManager.animatePulse(eid, intensity)` — Configurable pulse strength
  - `GameplayRenderer.renderHintArrow()` — Bezier curve with glow

### Floating Score Popups (B3)
- **FloatingTextManager**: Manages array of active floating texts
- **Triggered by**: `match_scored` event
- **Positioning**: Calculated centroid of match positions
- **Styling**:
  - Color = match ball color
  - Font size scales with cascade multiplier (capped at maxFontSize)
  - Floats upward at constant speed, fades out over duration
  - Shadow + outline for readability
- **Rendering**: Drawn after particles, before flash/toast

### Combo Escalation (B4)
- **Cascade Count** → **Effects**:
  - 2x: Small shake
  - 3x: Medium shake + flash + toast
  - 5x+: Heavy shake + **slow-mo** (0.3x speed, 0.3s) + particle explosion + "INCREDIBLE" toast
- **Border Glow**:
  - Intensity = `cascadeCount / 10` (capped at 1.0)
  - Color gradient: orange (#FF8800) → red (#FF0000)
  - Rendered as thick stroke around game board with blur
  - Resets to 0 on `cascade_end` event
- **SlowMotion**:
  - Modifies `engine.timeScale` (affects all time-based updates)
  - Automatically eases back to 1.0 in last 20% of duration

### Last-Move Tension (B5)
- **When `movesLeft === 1`**:
  - Vignette overlay darkens board edges (VisualConfig.lastMove.vignetteAlpha)
  - Moves counter pulses using sin wave (VisualConfig.lastMove.pulseSpeed)
- **Final Move Resolution**:
  - Dramatic pause (500ms) after move decrement before cascade starts
  - Extra particle burst on level complete with last move (via EventBus)
- **Config**: `VisualConfig.lastMove` — vignetteAlpha, pulseSpeed, dramaticPauseDuration

### Idle Animations (B6)
- **Ball Breathing**:
  - Subtle scale oscillation: `1 + sin(time * speed + row * stagger) * scaleAmount`
  - Row-staggered timing for wave effect
  - Config: `VisualConfig.idleAnimations.breathe` (scale: 0.02, speed: 1.5, rowStagger: 0.3)
- **Special Ball Effects**:
  - Periodic sparkle on striped/bomb balls (white glow overlay every 3s)
  - Rainbow balls continuously cycle hue using HSL transform
  - Config: `VisualConfig.idleAnimations.sparkle`, `rainbowHueSpeed`
- **Implementation**: `BallRenderer.drawBall()` accepts `time` param for animations

### Board Shuffle Visual (B7)
- **Replaces instant reshuffle with 4-phase animation**:
  1. **Shrink**: All balls scale to 0.1 (300ms)
  2. **Scatter**: Balls move to random screen positions (400ms)
  3. **Reshuffle**: Grid.reshuffle() called, entities repositioned
  4. **Reform**: Balls grow to scale 1 at new grid positions (500ms, staggered)
- **Triggered**: When no valid moves remain after cascade
- **Config**: `AnimationConfig.shuffle` (shrinkDuration, scatterDuration, reformDuration)
- **Implementation**: `AnimationManager.animateShuffle(entities, onComplete)`

## Obstacle System (Data-Driven)

All obstacle types defined as data in `config/CellTypes.ts`. Game logic reads **behavior flags**, never type names.

### CellTypeDef Flags
| Flag | Meaning |
|------|---------|
| `immovable` | Stays in place during gravity (partitions column into segments) |
| `matchable` | Ball inside participates in color matches |
| `swappable` | Player can select/swap this cell |
| `containsBall` | Has a ball underneath (revealed on destroy) |

### Built-in Types
| Type | immovable | matchable | swappable | containsBall | hp | visual.mode |
|------|-----------|-----------|-----------|-------------|----|----|
| `stone` | true | false | false | false | 2 | solid |
| `ice` | false | false | false | true | 1 | overlay |

### Adding a New Obstacle Type
1. Add entry to `CELL_TYPES` in `config/CellTypes.ts` with behavior flags, damage rules, visual descriptor, and effects
2. Reference it in level configs via `obstacles: [{ type: 'mytype', r, c, hp }]`
3. **No code changes needed** — all logic reads flags generically

### Damage Model
- `damage.adjacentMatch` — HP lost when adjacent cell is cleared by a match
- `damage.specialHit` — HP lost when directly hit by special activation
- Tracked in `GameplayStateMachine.applyObstacleDamage()`

### Rendering
- `visual.mode: 'solid'` — Drawn instead of ball (e.g., stone)
- `visual.mode: 'overlay'` — Drawn on top of ball (e.g., ice)
- `visual.crackAlphas[]` — Procedural crack overlay at each damage stage
- `BallRenderer.drawObstacle()` reads visual descriptor generically

## Objectives System

Per-level objectives beyond simple score targets. Uses `ObjectiveTracker` from `@speedai/game-engine`.

### Objective Types
| Type | ID Convention | Incremented When |
|------|--------------|------------------|
| `collect_color` | `collect_red`, `collect_blue`, ... | Balls cleared by matches |
| `activate_special` | `special_bomb`, `special_striped_h`, ... | Special ball activated |
| `clear_obstacle` | `obstacle_ice`, `obstacle_stone`, ... | Obstacle destroyed |
| `score` | `score` | Points earned |

### Level Complete Condition
`objectiveTracker.allComplete()` — all objectives must reach target. When no explicit objectives defined, defaults to score objective.

### Rendering
- Objectives panel shown below header when `levelConfig.objectives` is defined
- Each row: colored icon + label + `current/target` or checkmark
- Config in `ObjectiveConfig.ts`, display labels via `getObjectiveDisplay(id)`

## Level Progression (20 Levels)

Defined in `grid/LevelConfig.ts`. 6 phases:

| Phase | Levels | Colors | Obstacles | Key Objectives |
|-------|--------|--------|-----------|----------------|
| Tutorial | 1-3 | 4 | None | Score only |
| Color Objectives | 4-6 | 4-5 | None | collect_color + score |
| Ice Introduction | 7-10 | 5 | Ice (4→10) | clear_obstacle (ice) |
| Stone Introduction | 11-14 | 5-6 | Stone, Stone+Ice | clear_obstacle (stone) |
| Combination | 15-18 | 6 | Stone+Ice dense | Multi-objective (3 objectives) |
| Expert | 19-20 | 6 | 8 stone + 10-12 ice | All objective types, tight moves |

Levels beyond 20 use procedural formula (score-only, all 6 colors).

## Special Balls

| Type | Created By | Activation |
|------|-----------|------------|
| Striped (H/V) | 4-match (line) | Clears row/column |
| Bomb | 5-match (L/T) | Clears 3x3 area |
| Rainbow | 6-match (line) | Clears all of target color |

### Special Combos
- Striped + Striped → Cross explosion
- Bomb + Bomb → 5x5 area
- Rainbow + Rainbow → Clear entire board
- Rainbow + Striped/Bomb → Convert all to striped/bomb

## Grid System (`/src/grid/`)

- **Grid.ts** — 2D cell model, coordinate conversion, valid move detection, obstacle-aware gravity/shuffle
- **MatchDetector.ts** — Detects H/V/diagonal 3+ matches + special patterns, skips non-matchable obstacles
- **BallGenerator.ts** — Weighted random with history penalty (prevents streaks)
- **SpecialResolver.ts** — Special activation logic + combo chains
- **LevelConfig.ts** — 20-level progression table with obstacles, objectives, procedural formula for 20+

## Animation System

- **AnimationManager** — High-level animation orchestration
  - Tracks pending count, signals completion via callbacks
  - All animations use TweenSystem (no `setTimeout`)
- **Key Animations**:
  - Entrance: Staggered column-by-column drop
  - Swap: Simultaneous position tweens
  - Clear: Wobble → shrink + fade
  - Suck: Move toward target while shrinking (for specials)
  - Fall: Physics-based with bounce
  - Special intros: Type-specific squash/stretch effects

## Rendering Pipeline

1. Background gradient
2. Apply screen shake
3. Last-move vignette (if movesLeft === 1)
4. UI header (level, score, moves)
5. **Objectives panel** (if explicit objectives defined) OR progress bar + target
6. Grid cells (faint backgrounds)
7. **Border glow** (if combo active)
8. **Solid obstacles** (stone — drawn instead of balls)
9. Balls (with entity components for position/scale/alpha)
10. **Overlay obstacles** (ice — drawn on top of balls)
11. Selection highlight (pulsing)
12. **Hint arrow** (if strong hint active)
13. Special effects (beams, rings, lightning)
14. Restore shake
15. Particles
16. **Floating score texts**
17. Flash overlay
18. Toast messages

## Common Gotchas

- **Entity-Grid Sync**: Grid stores cell data, entityMap stores entity IDs. Always update both.
- **Animation Completion**: Use `animManager.whenDone()` callbacks for state transitions.
- **Cascade Dampening**: BallGenerator reduces match probability during long cascades to prevent infinite loops.
- **Time Scale**: SlowMotion modifies global `engine.timeScale` — affects all dt-based logic.
- **Magic Numbers**: Always add constants to config files, never hardcode.

## Testing a Feature

1. Update config files with new constants
2. Implement logic in appropriate module (Scene/StateMachine/Renderer)
3. Fire events via EventBus for cross-module communication
4. Subscribe to events in GameplayScene for side effects (particles, shake, etc.)
5. Add rendering in GameplayRenderer if needed
6. Test cascade scenarios (1x, 3x, 5x+) for juice features
7. Verify no regressions in existing features

## Future Extraction (Engine Grid Toolkit)

When generalizing to `@speedai/game-engine/grid`:
- Extract `Grid` → `GridModel<T>` (generic)
- Extract `MatchDetector` → `GridMatcher` (configurable patterns)
- Extract gravity/refill logic → `GridGravity`
- Extract input handling → `GridInput`
- Extract `BallGenerator` logic → `WeightedPicker<T>`

See `/plan.md` Section A for details.
