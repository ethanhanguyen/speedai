# Ball Crush — Sprite Generation Prompts

Use these prompts with any AI image generator (Midjourney, DALL-E, Stable Diffusion, Leonardo AI, etc.).
All sprites should be generated as **transparent PNG, 256×256px**, then downscaled to 44×44 for in-game use.

---

## Ball Sprites (6 colors)

### Red Ball
```
A single glossy candy sphere, cherry red color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

### Blue Ball
```
A single glossy candy sphere, sapphire blue color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

### Green Ball
```
A single glossy candy sphere, emerald green color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

### Yellow Ball
```
A single glossy candy sphere, golden yellow color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

### Purple Ball
```
A single glossy candy sphere, royal purple color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

### Orange Ball
```
A single glossy candy sphere, tangerine orange color, 3D rendered, soft studio lighting from top-left, white specular highlight, subtle reflection on surface, transparent background, game asset, centered, no shadow, hyper-realistic candy crush style, isometric view, smooth gradient shading
```

---

## Special Ball Overlays

### Striped Horizontal
```
A single glossy candy sphere, black color, with 3 thin luminous white horizontal stripes wrapping around the sphere, glowing neon stripe effect, 3D rendered, soft studio lighting, transparent background, game asset, centered, candy crush style
```

### Striped Vertical
```
A single glossy candy sphere, black color, with 3 thin luminous white vertical stripes wrapping around the sphere, glowing neon stripe effect, 3D rendered, soft studio lighting, transparent background, game asset, centered, candy crush style
```

### Bomb / Wrapped
```
A single glossy candy sphere, white color, wrapped in a translucent glowing energy ring, inner cross-shaped light pattern, magical aura effect, 3D rendered, soft studio lighting, transparent background, game asset, centered, candy crush style power-up
```

### Rainbow Ball
```
A single glossy candy sphere with swirling rainbow gradient surface, iridescent holographic shimmer, prismatic light reflections, magical sparkle particles around it, 3D rendered, soft studio lighting, transparent background, game asset, centered, candy crush style, special power-up
```

---

## UI Elements

### Grid Cell Background
```
A single rounded square tile, dark semi-transparent glass material, subtle inner bevel, soft blue-purple tint, frosted glass effect, 3D rendered, transparent background, game UI element, 44x44 pixels, minimal design
```

### Selection Highlight
```
A glowing rounded square outline, bright white neon light, pulsing energy border, soft bloom effect, transparent center, transparent background, game UI element, 48x48 pixels
```

### Board Background
```
A large dark rounded rectangle panel, frosted glass material, subtle purple-blue gradient, soft inner shadow, decorative corner accents, elegant game board frame, transparent background, game UI element, 414x414 pixels
```

---

## Effects (Sprite Sheets)

### Ball Pop / Shatter (4-frame sheet)
```
Sprite sheet of a glossy candy sphere shattering into pieces, 4 frames left to right: intact sphere, cracking, exploding into shards, sparkling particles dispersing, [COLOR] colored candy, transparent background, game effect animation, 256x64 pixels
```

### Sparkle / Match Effect (4-frame sheet)
```
Sprite sheet of a magical sparkle burst effect, 4 frames left to right: tiny star, expanding star burst, radiant glow, fading particles, golden white color, transparent background, game effect animation, 256x64 pixels
```

---

## Background

### Game Background (430×750)
```
A dark elegant abstract background for a mobile puzzle game, deep navy blue to purple gradient, subtle geometric patterns, faint bokeh light orbs, dreamy atmosphere, no text, no objects, soft and clean, 430x750 pixels, portrait orientation
```

### Menu Background (430×750)
```
A vibrant colorful abstract background for a candy puzzle game menu screen, swirling candy-colored lights, bokeh orbs in red blue green yellow purple orange, magical dreamy atmosphere, dark base with colorful accents, no text, 430x750 pixels, portrait orientation
```

---

## Logo / Title

### Game Logo
```
"Ball Crush" game logo text, glossy 3D candy-style lettering, each letter a different candy color (red blue green yellow purple), chrome reflections, subtle drop shadow, playful rounded font, transparent background, game title asset
```

---

## Generation Tips

1. **Batch by color**: Generate all 6 base balls in one session for style consistency
2. **Consistent lighting**: Always specify "studio lighting from top-left" for uniform look
3. **Post-processing**: After generation, use ImageMagick or similar to:
   - Crop to tight bounding box
   - Resize to 256×256 (master) and 44×44 (in-game)
   - Ensure true transparency (remove any generated "transparent" checkerboard)
4. **Style seed**: If your generator supports seeds, lock the seed across all ball variants
5. **Negative prompts** (for SD/Midjourney): `text, watermark, multiple objects, shadow on ground, background elements, flat design, 2D, cartoon`
