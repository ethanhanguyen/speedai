# File Guide

## Directory Structure

```
packages/ball-crush/
├── index.html                          Canvas host (430×750)
├── package.json                        Package config
├── tsconfig.json                       TypeScript config
├── vite.config.ts                      Dev server (port 3001)
├── SPRITE_PROMPTS.md                   AI image gen prompts for sprites
├── docs/
│   ├── architecture.md                 System design overview
│   ├── game-mechanics.md               Rules, scoring, levels
│   └── file-guide.md                   This file
└── src/
    ├── main.ts                         Entry point, engine + scene wiring
    ├── components/
    │   └── BallData.ts                 Ball types, color constants
    ├── config/                         Configuration constants (no magic numbers)
    │   ├── GameplayConfig.ts           Scoring, cascade, combo thresholds
    │   ├── VisualConfig.ts             Ball rendering, effects, idle anims, vignette
    │   ├── AnimationConfig.ts          Tween durations, shuffle phases
    │   ├── LayoutConfig.ts             Canvas dimensions, grid layout
    │   ├── HintConfig.ts               Hint timing + arrow visuals
    │   └── ScorePopupConfig.ts         Floating text style
    ├── grid/
    │   ├── Grid.ts                     9×9 grid model, coord math
    │   ├── BallGenerator.ts            Weighted random with history penalty
    │   ├── MatchDetector.ts            Pattern scanning (line, L, T, cross)
    │   ├── SpecialResolver.ts          Special activation + combos
    │   └── LevelConfig.ts              Level definitions + formula
    ├── rendering/
    │   ├── BallRenderer.ts             Procedural ball drawing, idle anims (B6)
    │   ├── SpecialEffectRenderer.ts    Beams, rings, lightning overlays
    │   ├── FloatingText.ts             Score popups (B3)
    │   └── AnimationManager.ts         Tween orchestration, shuffle (B7)
    └── scenes/
        ├── MenuScene.ts                Title screen + Play button
        ├── GameplayScene.ts            Core orchestrator (entities + events)
        ├── GameplayInputHandler.ts     Input → action intents
        ├── GameplayStateMachine.ts     State transitions + cascade logic
        ├── GameplayRenderer.ts         All draw calls, vignette (B5)
        ├── LevelCompleteScene.ts       Score breakdown + Next Level
        └── GameOverScene.ts            High score display + Play Again
```

## Key Files

### `src/main.ts`
Engine initialization. Creates `TweenSystem`, wires 4 scenes, manages level/score state across scene transitions.

### `src/grid/Grid.ts`
The source of truth for game state. The `cells[row][col]` 2D array stores color, special type, and entity ID. Provides:
- `fillRandom(colors)` — no-prematch board generation
- `screenToGrid(x, y)` / `gridToScreen(r, c)` — coordinate conversion
- `hasValidMoves(colors)` — deadlock detection
- `reshuffle(colors)` — Fisher-Yates shuffle with fallback

### `src/grid/MatchDetector.ts`
`detectMatches(cells)` scans the full board for all matches. Finds line segments in 4 directions (H, V, D1, D2), then merges intersecting lines into L/T/cross patterns. Returns `Match[]` with positions, pattern type, and what special to create.

### `src/grid/SpecialResolver.ts`
Two functions:
- `resolveSpecial()` — activates a single special (row clear, col clear, 3×3, rainbow)
- `resolveSpecialCombo()` — handles two specials swapped together (cross, 5×5, 3-row+3-col, rainbow chain)

### `src/scenes/GameplayScene.ts`
Main orchestrator. Manages entities, EventBus subscriptions, and wires together the three modules below. Handles particle effects, shake, flash, toast, floating text via event listeners.

### `src/scenes/GameplayInputHandler.ts`
Converts raw input (tap, drag) into game actions (select, swap). Validates adjacency, handles invalid swap feedback.

### `src/scenes/GameplayStateMachine.ts`
State machine (`ENTRANCE | IDLE | SWAPPING | MATCH_CHECK | CLEARING | FALLING | REFILLING | RECHECK`). Processes matches, cascades, scoring, special activations. Fires EventBus events for cross-cutting concerns.

### `src/scenes/GameplayRenderer.ts`
All rendering logic. Draws background, UI, grid, balls, selection, hints, vignette (B5), border glow (B4), special effects, particles, floating text.

### `src/rendering/AnimationManager.ts`
Wraps `TweenSystem` with completion tracking. Methods: `animateSwap()`, `animateClear()`, `animateFall()`, `animateShuffle()` (B7). State machine uses `whenDone(callback)` for transitions.

### `src/rendering/BallRenderer.ts`
Pure Canvas 2D drawing. Each ball is a radial gradient circle with a white highlight ellipse. Specials add overlays:
- Striped: parallel lines clipped to the circle
- Bomb: ring + inner cross
- Rainbow: segmented colored arc

## Data Flow

```
User clicks → screenToGrid → select/swap → Grid.swap()
→ detectMatches() → processMatches() → resolveSpecial()
→ animateClear() → grid.setCell(null) → applyGravity()
→ animateFall() → refillBoard() → spawnBallEntity()
→ animateRefill() → RECHECK (loop) or IDLE
```
