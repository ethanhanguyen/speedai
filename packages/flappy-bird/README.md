# @speedai/flappy-bird

Flappy Bird implementation using [@speedai/game-engine](../game-engine).

## Quick Start

```bash
npm run dev    # Development server
npm run build  # Production build
```

## Implementation

- **ECS Architecture**: Entities, components, systems
- **Scenes**: Menu → Gameplay → GameOver
- **Systems**: BirdPhysics, PipeSpawner, Scroll, Velocity, Collision, Score
- **Assets**: Sprites (bird, pipes, ground, bg)

See [GAME_SPEC_flappybird.md](../../GAME_SPEC_flappybird.md) for full specification.

## Controls

- **Space / Click / Tap**: Flap
