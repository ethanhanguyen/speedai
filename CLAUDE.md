# SpeedAI Monorepo

## Structure
- `packages/game-engine/` — `@speedai/game-engine`: ECS game engine (Canvas 2D, zero-dep)
- `packages/flappy-bird/` — `@speedai/flappy-bird`: Flappy Bird implementation
- `packages/ball-crush/` — `@speedai/ball-crush`: Ball Crush (match-3) implementation
- `packages/battle-tank/` — `@speedai/battle-tank`: Top-down tank game (tilemap, composite sprites)
- `packages/demo/` — `@speedai/demo`: Arcade landing page (game tiles)
- `GAME_SPEC.template.md` — Template for specifying new games
- `GAME_SPEC_flappybird.md` — Flappy Bird game specification
- `plan_phases.md` — Battle Tank phased implementation plan

## Commands (run from repo root)
**Game Engine:**
- Build: `npm run build -w packages/game-engine`
- Test: `npm run test -w packages/game-engine`
- Typecheck: `npm run typecheck -w packages/game-engine`

**Flappy Bird:**
- Dev: `npm run dev -w packages/flappy-bird`
- Build: `npm run build -w packages/flappy-bird`
- Preview: `npm run preview -w packages/flappy-bird`
- Typecheck: `npm run typecheck -w packages/flappy-bird`

**Ball Crush:**
- Dev: `npm run dev -w packages/ball-crush`
- Build: `npm run build -w packages/ball-crush`
- Preview: `npm run preview -w packages/ball-crush`
- Typecheck: `npm run typecheck -w packages/ball-crush`

**Battle Tank:**
- Dev: `npm run dev -w packages/battle-tank`
- Build: `npm run build -w packages/battle-tank`
- Preview: `npm run preview -w packages/battle-tank`
- Typecheck: `npm run typecheck -w packages/battle-tank`
- Map Designer: `npm run designer -w packages/battle-tank` → http://localhost:5174
- Generate Map (LLM): `npm run generate-map -w packages/battle-tank -- --prompt "<goals>" --api-key <key>`

**Demo (Arcade Landing Page):**
- Dev: `npm run dev -w packages/demo`
- Build: `npm run build -w packages/demo`

## Conventions
- TypeScript strict mode, ES2020 target, ESM (`"type": "module"`)
- Vite for bundling, Vitest for tests
- All imports use `.js` extension (ESM resolution)
