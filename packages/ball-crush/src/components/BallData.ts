export type BallColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type SpecialType = 'none' | 'striped_h' | 'striped_v' | 'bomb' | 'rainbow';

export interface BallData {
  color: BallColor;
  special: SpecialType;
  gridRow: number;
  gridCol: number;
}

export const ALL_COLORS: BallColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export const COLOR_HEX: Record<BallColor, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
};

export const COLOR_LIGHT: Record<BallColor, string> = {
  red: '#ff7675',
  blue: '#74b9ff',
  green: '#55efc4',
  yellow: '#ffeaa7',
  purple: '#d6a3e8',
  orange: '#fab1a0',
};

export const SPECIAL_COLORS: Record<Exclude<SpecialType, 'none'>, string> = {
  striped_h: '#e0e0e0',
  striped_v: '#e0e0e0',
  bomb: '#2c3e50',
  rainbow: '#ffffff',
};
