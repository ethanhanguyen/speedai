// ─── Core ───
export {
  Engine,
  EntityManager,
  System,
  EventEmitter,
  ComponentType,
  ComponentFactory,
  ComponentPool,
} from './core/index.js';

export type {
  EngineState,
  EntityId,
  Vec2,
  Rect,
  ComponentData,
  PositionComponent,
  VelocityComponent,
  SpriteComponent,
  PhysicsBodyComponent,
  HealthComponent,
  IRenderer,
  IPhysicsEngine,
  ISoundManager,
  IInputManager,
  IScene,
  BodyConfig,
  CollisionEvent,
  CollisionCallback,
  MusicOptions,
  SfxOptions,
  GestureType,
  GestureEvent,
  GestureCallback,
  Poolable,
  ErrorHandler,
  DebugConfig,
  EngineConfig,
  EventCallback,
} from './core/index.js';

// ─── Adapters ───
export { CanvasRenderer } from './adapters/rendering/CanvasRenderer.js';
export { SimplePhysics } from './adapters/physics/SimplePhysics.js';
export { UnifiedInput } from './adapters/input/UnifiedInput.js';
export { HowlerAdapter } from './adapters/sound/HowlerAdapter.js';

// ─── Assets ───
export { AssetManager } from './assets/AssetManager.js';
export type { AssetType, AssetEntry, AtlasData, ImageProcessOptions } from './assets/AssetManager.js';

// ─── Scene ───
export { Scene } from './scene/Scene.js';
export { SceneManager } from './scene/SceneManager.js';
export type { TransitionType, TransitionConfig } from './scene/SceneManager.js';

// ─── Systems ───
export { TweenSystem, Easing } from './systems/TweenSystem.js';
export type { EasingFn, TweenConfig } from './systems/TweenSystem.js';
export { ScoreSystem } from './systems/ScoreSystem.js';
export type { ScoreConfig } from './systems/ScoreSystem.js';
export { LivesSystem } from './systems/LivesSystem.js';
export type { LivesConfig } from './systems/LivesSystem.js';
export { TimerSystem } from './systems/TimerSystem.js';
export type { TimerConfig } from './systems/TimerSystem.js';
export { ObjectPoolSystem } from './systems/ObjectPoolSystem.js';
export type { PoolConfig } from './systems/ObjectPoolSystem.js';
export { CameraSystem } from './systems/CameraSystem.js';
export type { CameraConfig } from './systems/CameraSystem.js';
export { CollisionSystem } from './systems/CollisionSystem.js';
export type { CollisionPair } from './systems/CollisionSystem.js';

// ─── UI ───
export { Button } from './ui/Button.js';
export type { ButtonConfig } from './ui/Button.js';
export { ProgressBar } from './ui/ProgressBar.js';
export type { ProgressBarConfig } from './ui/ProgressBar.js';
export { Modal } from './ui/Modal.js';
export type { ModalConfig } from './ui/Modal.js';
export { Toast } from './ui/Toast.js';
export type { ToastConfig } from './ui/Toast.js';
export { StarRating } from './ui/StarRating.js';
export type { StarRatingConfig } from './ui/StarRating.js';
export { Text } from './ui/Text.js';
export type { TextConfig } from './ui/Text.js';
export { VirtualJoystick } from './ui/VirtualJoystick.js';
export type { VirtualJoystickConfig } from './ui/VirtualJoystick.js';
export { VirtualButton } from './ui/VirtualButton.js';
export type { VirtualButtonConfig } from './ui/VirtualButton.js';
export { DPad } from './ui/DPad.js';
export type { DPadConfig, DPadDirection } from './ui/DPad.js';

// ─── Effects ───
export { ScreenShake } from './effects/ScreenShake.js';
export { SlowMotion } from './effects/SlowMotion.js';
export { ParticleBurst } from './effects/ParticleBurst.js';
export type { ParticleBurstConfig } from './effects/ParticleBurst.js';
export { Flash } from './effects/Flash.js';
export { Juice } from './effects/Juice.js';

// ─── Persistence ───
export type { ISaveManager } from './persistence/ISaveManager.js';
export { LocalStorageAdapter } from './persistence/LocalStorageAdapter.js';
export { CloudSaveAdapter } from './persistence/CloudSaveAdapter.js';
export type { CloudSaveConfig } from './persistence/CloudSaveAdapter.js';

// ─── Analytics ───
export { EventBus } from './analytics/EventBus.js';
export type { GameEvent } from './analytics/EventBus.js';
export { PerformanceMonitor } from './analytics/IAnalytics.js';
export type { IAnalytics } from './analytics/IAnalytics.js';

// ─── Social ───
export type {
  ISocialProvider,
  ScoreEntry,
  LeaderboardFilter,
  LeaderboardEntry,
  LeaderboardResult,
  AchievementCondition,
  AchievementConfig,
  Achievement,
  ChallengeGoal,
  Challenge,
  Reward,
  UserProfile,
  ShareableResult,
  ShareLink,
} from './social/ISocialProvider.js';
export { LeaderboardManager } from './social/LeaderboardManager.js';
export { AchievementManager } from './social/AchievementManager.js';
export type { UserStats } from './social/AchievementManager.js';
export { ChallengeManager } from './social/ChallengeManager.js';
export { ProfileManager } from './social/ProfileManager.js';
export { SharingManager } from './social/SharingManager.js';

// ─── Grid ───
export { GridModel, NeighborDirection } from './grid/GridModel.js';
export { GridMatcher } from './grid/GridMatcher.js';
export type { Match, MatchPattern, ScanDirection, PatternRule, GridMatcherConfig } from './grid/GridMatcher.js';
export { GridGravity } from './grid/GridGravity.js';
export type { GravityDirection, FallMove, RefillEntry } from './grid/GridGravity.js';
export { GridInput } from './grid/GridInput.js';
export type { CellTapEvent, CellSwipeEvent, CellDragEvent, CellTapCallback, CellSwipeCallback, CellDragCallback, GridInputConfig } from './grid/GridInput.js';
export { GridRenderer } from './grid/GridRenderer.js';
export type { GridRendererConfig } from './grid/GridRenderer.js';

// ─── Utils ───
export { WeightedPicker } from './utils/WeightedPicker.js';
export { ObjectiveTracker } from './utils/ObjectiveTracker.js';
export type { ObjectiveDef, ObjectiveState } from './utils/ObjectiveTracker.js';
export { FrameAnimator } from './utils/FrameAnimator.js';
