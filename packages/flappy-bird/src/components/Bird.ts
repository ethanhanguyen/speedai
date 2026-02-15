export interface BirdComponent {
  flapVelocity: number;
  rotationSpeed: number;
  isDead: boolean;
}

export function createBirdComponent(): BirdComponent {
  return {
    flapVelocity: -350,
    rotationSpeed: 3,
    isDead: false,
  };
}
