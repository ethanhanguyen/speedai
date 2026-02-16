# Game Mechanics

## Matching Rules

### Basic Matches
- **3+ in a line** in any of 8 directions: horizontal, vertical, and both diagonals
- Matches are detected after every swap and after every refill (cascade)

### Pattern Recognition Priority
| Pattern | Detection | Special Created |
|---------|-----------|----------------|
| 5+ in a line | Longest consecutive | Rainbow ball |
| L-shape | Two 3+ lines intersecting at an end | Bomb |
| T-shape | Two 3+ lines intersecting at a midpoint | Bomb |
| Cross | Two 5+ lines intersecting | Rainbow ball |
| 4 in a line | 4 consecutive same-color | Striped ball (perpendicular) |
| 3 in a line | 3 consecutive same-color | No special |

### Direction-Specific Striped Balls
- Horizontal match (4+) → creates **vertical striped** ball
- Vertical match (4+) → creates **horizontal striped** ball
- Diagonal match (4+) → creates random striped orientation

## Special Balls

### Striped Ball (Horizontal)
- **Created by**: 4-match in a vertical line
- **Activation**: Clears the entire row it's on

### Striped Ball (Vertical)
- **Created by**: 4-match in a horizontal line
- **Activation**: Clears the entire column it's on

### Bomb Ball
- **Created by**: L-shape or T-shape intersection
- **Activation**: Clears a 3×3 area centered on itself

### Rainbow Ball
- **Created by**: 5+ in a line, or cross pattern
- **Activation**: Clears all balls of the swapped-with color

## Special + Special Combos

When two special balls are swapped with each other:

| Combo | Effect |
|-------|--------|
| Striped + Striped | Clears full row AND full column of both positions |
| Bomb + Bomb | Clears a 5×5 area |
| Bomb + Striped | Clears 3 rows AND 3 columns centered on the bomb |
| Rainbow + Any | Clears all balls of the other ball's color, activating any specials among them |

## Scoring

### Base Points
- Each ball cleared: **10 points**
- Special combo clears: **15 points per ball**

### Cascade Multiplier
- First match after a swap: **1×**
- Each subsequent cascade (chain reaction): multiplier increases by 1
- E.g., 3rd cascade in a chain scores at **3×**

### Level Completion Bonus
- Each remaining move at level end: **+50 points**

## Level Progression

### Levels 1–10 (hand-tuned)
| Level | Colors | Moves | Target Score |
|-------|--------|-------|-------------|
| 1 | 4 | 30 | 1,000 |
| 2 | 4 | 28 | 1,500 |
| 3 | 5 | 28 | 2,000 |
| 4 | 5 | 26 | 2,800 |
| 5 | 5 | 25 | 3,500 |
| 6 | 6 | 25 | 4,500 |
| 7 | 6 | 24 | 5,500 |
| 8 | 6 | 22 | 7,000 |
| 9 | 6 | 20 | 8,500 |
| 10 | 6 | 20 | 10,000 |

### Levels 11+ (formula)
- Colors: always 6
- Moves: `max(15, 20 - floor((level - 10) / 3))`
- Target: `10000 + (level - 10) × 1500`

## Board Management

### No Pre-Matches
Board generation guarantees no 3+ matches exist when a level starts.

### No Valid Moves
If no valid swap can produce a match, the board reshuffles automatically. A toast notification tells the player.

### Reshuffle Logic
1. Collect all balls, Fisher-Yates shuffle, place back
2. If still no valid moves, regenerate the board entirely

### Reshuffle Animation (B7)
4-phase visual: shrink → scatter to random positions → reshuffle grid → reform at new positions
