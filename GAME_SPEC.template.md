# Game Spec: [Game Name]

Uses `@speedai/game-engine` (ECS architecture, Canvas 2D).

---

## 1. Core Concept

- **Genre**: [e.g., puzzle, platformer, endless runner, match-3, clicker, bullet hell]
- **One-liner**: [One sentence describing the game]
- **Platform**: [web-desktop / web-mobile / both]
- **Orientation**: [landscape / portrait / responsive]
- **Viewport**: [width x height, e.g., 800x600]

## 2. Gameplay

### Rules
- [How does the player win/lose?]
- [Scoring mechanic]
- [Lives/health mechanic, if any]

### Player Actions
- [List each input → action mapping]
- **Keyboard**: [e.g., Arrow keys = move, Space = jump]
- **Mouse/Touch**: [e.g., Click = shoot, Drag = aim]
- **Gestures**: [e.g., Swipe = dash, Pinch = zoom] _(mobile only)_

### Game Flow
```
[Scene] → [Scene] → ...
e.g.: Loading → Menu → Gameplay → GameOver → Menu
```

### Difficulty
- [Static / ramps over time / level-based]
- [What changes? Speed, enemy count, timer, etc.]

## 3. Entities

List every game object. For each:

| Entity | Components | Behavior |
|--------|-----------|----------|
| Player | Position, Sprite, Velocity, Health | Moves via input, collides with enemies |
| Enemy  | Position, Sprite, Velocity, Tag("enemy") | Spawns off-screen, moves toward player |
| Bullet | Position, Sprite, Velocity, Tag("bullet") | Fired by player, destroyed on collision |
| _..._ | | |

## 4. Systems Needed

Check which built-in systems to use:

- [ ] **CollisionSystem** — AABB overlap detection
- [ ] **TweenSystem** — Animations/easing
- [ ] **ScoreSystem** — Points, combos, multipliers
  - Base points: ___
  - Combo timeout: ___s
  - Max multiplier: ___x
- [ ] **LivesSystem** — Hearts/lives
  - Starting lives: ___
  - Regen: yes/no
- [ ] **TimerSystem** — Countdowns, cooldowns
- [ ] **ObjectPoolSystem** — Entity recycling (for bullets, particles, enemies)
  - Pool: ___ (max size: ___)
- [ ] **CameraSystem** — Follow, shake, zoom
  - Follow target: ___
  - World bounds: ___

### Custom Systems
- [System name]: [What it does, which components it queries]

## 5. Scenes

| Scene | Purpose | UI Elements |
|-------|---------|-------------|
| Loading | Asset loading + progress bar | ProgressBar |
| Menu | Start button, title | Button, Text |
| Gameplay | Main game loop | Text (score/lives/timer) |
| GameOver | Final score, restart | Button, Text, StarRating |
| _..._ | | |

## 6. Assets

| Key | Type | Path | Notes |
|-----|------|------|-------|
| player | image | /sprites/player.png | 64x64 |
| bg_music | audio | /audio/bg.mp3 | Loop |
| sfx_hit | audio | /audio/hit.wav | SFX |
| levels | json | /data/levels.json | Level configs |
| sprites | atlas | /sprites/atlas.json | Spritesheet |

## 7. Sprite Generation (Optional)

If using AI image generation tools (e.g., nano banana, DALL-E, Midjourney) to create sprites:

### Best Practices for Consistent Results

1. **Establish a Style Guide First**
   - Generate a reference sprite with your desired style
   - Document the exact prompt that produced good results
   - Use this as a template for all subsequent sprites

2. **Prompt Structure**
   ```
   [Subject], [Style], [View/Angle], [Background], [Technical specs]

   Example:
   "pixel art bird character, 16-bit retro game style, side view, transparent background,
   64x64 pixels, simple shapes, bright colors, no gradients"
   ```

3. **Consistency Techniques**
   - **Lock the style**: Always use the same style descriptor (e.g., "16-bit pixel art", "flat design 2D", "hand-drawn cartoon")
   - **Fixed perspective**: Specify the same view angle for all sprites (e.g., "side view", "top-down", "isometric")
   - **Color palette**: Define a color palette upfront and include it in prompts (e.g., "using colors: #FF6B6B, #4ECDC4, #FFD93D")
   - **Reference sprites**: Include "similar to [first sprite description]" for related assets
   - **Technical consistency**: Always specify the same dimensions and technical requirements

4. **Recommended Prompt Elements**
   - ✅ Subject (what the sprite is)
   - ✅ Art style (pixel art, flat design, vector, cartoon, etc.)
   - ✅ Perspective (side view, top-down, 3/4 view)
   - ✅ Background (transparent, solid color, none)
   - ✅ Dimensions (64x64, 128x128, etc.)
   - ✅ Color palette or color restrictions
   - ✅ Level of detail (simple, detailed, minimalist)
   - ❌ Avoid: vague terms like "cool" or "awesome"

5. **Example Prompt Set for a Game**
   ```
   Player sprite:
   "cute bird character, 16-bit pixel art style, side view facing right, transparent background,
   64x64 pixels, using colors #FFD700 #FF6347 #4169E1, simple rounded shapes"

   Enemy sprite:
   "angry pipe obstacle, 16-bit pixel art style, side view, transparent background,
   64x64 pixels, using colors #228B22 #006400, simple geometric shapes, same style as bird character"

   Background element:
   "fluffy cloud, 16-bit pixel art style, side view, transparent background,
   128x64 pixels, using colors #FFFFFF #E0E0E0, simple rounded shapes, same style as bird character"
   ```

6. **Post-Generation Cleanup**
   - Verify all sprites are the correct dimensions
   - Ensure backgrounds are truly transparent (check alpha channel)
   - Maintain consistent DPI/resolution
   - Test sprites at actual game scale to check readability

7. **When NOT to Use AI Generation**
   - If you need pixel-perfect precision (hand-draw or use sprite editor)
   - If you need animation frames with exact pixel correspondence
   - If licensing/copyright is critical (verify terms of your AI tool)

## 8. UI Overlay

Which canvas UI components:

- [ ] **Button** — [where, what action]
- [ ] **Text** — [what info: score, timer, lives]
- [ ] **ProgressBar** — [what: health, loading, cooldown]
- [ ] **Modal** — [when: pause, settings]
- [ ] **Toast** — [when: achievement, combo]
- [ ] **StarRating** — [when: game over rating]
- [ ] **VirtualJoystick** — [position, baseRadius, deadZone]
- [ ] **VirtualButton** — [position, label, e.g. "A"/"B"]
- [ ] **DPad** — [position, size]

## 9. Effects

- [ ] **ScreenShake** — [trigger: hit, explosion]
- [ ] **Flash** — [trigger: damage, power-up]
- [ ] **SlowMotion** — [trigger: near-miss, boss kill]
- [ ] **ParticleBurst** — [trigger: destroy, collect]

## 10. Persistence

- [ ] **LocalStorage** — [what to save: high score, settings, progress]
- [ ] **CloudSave** — [endpoint, what to sync]

## 11. Social (optional)

- [ ] **Leaderboard** — [board names, metric type]
- [ ] **Achievements** — list below:
  | ID | Name | Condition |
  |----|------|-----------|
  | first_win | First Win | games_played >= 1 |
- [ ] **Challenges** — [daily/weekly, goal type]
- [ ] **Sharing** — [platforms: twitter, clipboard, web-share]

## 12. Engine Config

```typescript
{
  canvas: '#game',
  width: ___,
  height: ___,
  renderer: new CanvasRenderer(),
  physics: new SimplePhysics({ gravity: { x: 0, y: ___ } }), // or null
  sound: new HowlerAdapter(), // or null
  input: new UnifiedInput(),
  targetFPS: 60,
  maxEntities: ___,
  debug: false,
  pauseOnBlur: true,
  autoResize: true,
}
```

## 13. Anything Else

- [Edge cases, special mechanics, monetization hooks, accessibility needs]
