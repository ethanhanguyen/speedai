/**
 * Frame animation utilities for sprite animations.
 * Converts time + FPS into frame indices.
 */

export class FrameAnimator {
  /**
   * Get current frame index for a looping animation.
   * @param time - Current time in seconds
   * @param frameCount - Total number of frames
   * @param fps - Frames per second
   * @returns Frame index (0 to frameCount-1)
   */
  static getLoopingFrame(time: number, frameCount: number, fps: number): number {
    const totalFrames = Math.floor(time * fps);
    return totalFrames % frameCount;
  }

  /**
   * Get current frame index for a one-shot animation.
   * @param elapsed - Time elapsed since animation start (seconds)
   * @param frameCount - Total number of frames
   * @param fps - Frames per second
   * @returns Frame index (0 to frameCount-1), clamped to last frame
   */
  static getOneShotFrame(elapsed: number, frameCount: number, fps: number): number {
    const frame = Math.floor(elapsed * fps);
    return Math.min(frame, frameCount - 1);
  }

  /**
   * Get current frame index for a ping-pong animation (forward then reverse).
   * @param time - Current time in seconds
   * @param frameCount - Total number of frames
   * @param fps - Frames per second
   * @returns Frame index (0 to frameCount-1)
   */
  static getPingPongFrame(time: number, frameCount: number, fps: number): number {
    const totalFrames = Math.floor(time * fps);
    const cycle = totalFrames % (frameCount * 2 - 2);
    return cycle < frameCount ? cycle : (frameCount * 2 - 2) - cycle;
  }

  /**
   * Check if a one-shot animation has completed.
   * @param elapsed - Time elapsed since animation start (seconds)
   * @param frameCount - Total number of frames
   * @param fps - Frames per second
   * @returns True if animation is complete
   */
  static isOneShotComplete(elapsed: number, frameCount: number, fps: number): boolean {
    return elapsed * fps >= frameCount;
  }

  /**
   * Get animation duration in seconds.
   * @param frameCount - Total number of frames
   * @param fps - Frames per second
   * @returns Duration in seconds
   */
  static getDuration(frameCount: number, fps: number): number {
    return frameCount / fps;
  }
}
